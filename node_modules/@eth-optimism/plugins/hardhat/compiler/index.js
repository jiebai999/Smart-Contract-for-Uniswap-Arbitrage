"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* Imports: External */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("hardhat/config");
const global_dir_1 = require("hardhat/internal/util/global-dir");
const artifacts_1 = require("hardhat/internal/artifacts");
const task_names_1 = require("hardhat/builtin-tasks/task-names");
/* Imports: Internal */
require("./type-extensions");
const OPTIMISM_SOLC_BIN_URL = 'https://raw.githubusercontent.com/ethereum-optimism/solc-bin/gh-pages/bin';
// I figured this was a reasonably modern default, but not sure if this is too new. Maybe we can
// default to 0.6.X instead?
const DEFAULT_OVM_SOLC_VERSION = '0.7.6';
/**
 * Find or generate an OVM soljson.js compiler file and return the path of this file.
 * We pass the path to this file into hardhat.
 * @param version Solidity compiler version to get a path for in the format `X.Y.Z`.
 * @return Path to the downloaded soljson.js file.
 */
const getOvmSolcPath = async (version) => {
    // If __DANGEROUS_OVM_IGNORE_ERRORS__ env var is not undefined we append the -no-errors suffix to the solc version.
    if (process.env.__DANGEROUS_OVM_IGNORE_ERRORS__) {
        console.log('\n\n__DANGEROUS_OVM_IGNORE_ERRORS__ IS ENABLED!\n\n');
        version += '-no_errors';
    }
    // First, check to see if we've already downloaded this file. Hardhat gives us a folder to use as
    // a compiler cache, so we'll just be nice and use an `ovm` subfolder.
    const ovmCompilersCache = path.join(await global_dir_1.getCompilersDir(), 'ovm');
    // Need to create the OVM compiler cache folder if it doesn't already exist.
    if (!fs.existsSync(ovmCompilersCache))
        [fs.mkdirSync(ovmCompilersCache, { recursive: true })];
    // Check to see if we already have this compiler version downloaded. We store the cached files at
    // `X.Y.Z.js`. If it already exists, just return that instead of downloading a new one.
    const cachedCompilerPath = path.join(ovmCompilersCache, `${version}.js`);
    if (fs.existsSync(cachedCompilerPath)) {
        return cachedCompilerPath;
    }
    console.log(`Downloading OVM compiler version ${version}`);
    // We don't have a cache, so we'll download this file from GitHub. Currently stored at
    // ethereum-optimism/solc-bin.
    const compilerContentResponse = await node_fetch_1.default(OPTIMISM_SOLC_BIN_URL + `/soljson-v${version}.js`);
    // Throw if this request failed, e.g., 404 because of an invalid version.
    if (!compilerContentResponse.ok) {
        throw new Error(`Unable to download OVM compiler version ${version}. Are you sure that version exists?`);
    }
    // Otherwise, write the content to the cache. We probably want to do some sort of hash
    // verification against these files but it's OK for now. The real "TODO" here is to instead
    // figure out how to properly extend and/or hack Hardat's CompilerDownloader class.
    const compilerContent = await compilerContentResponse.text();
    fs.writeFileSync(cachedCompilerPath, compilerContent);
    return cachedCompilerPath;
};
config_1.subtask(task_names_1.TASK_COMPILE_SOLIDITY_RUN_SOLC, async (args, hre, runSuper) => {
    var _a, _b;
    if (hre.network.ovm !== true) {
        return runSuper(args);
    }
    // Just some silly sanity checks, make sure we have a solc version to download. Our format is
    // `X.Y.Z` (for now).
    let ovmSolcVersion = DEFAULT_OVM_SOLC_VERSION;
    if ((_b = (_a = hre.config) === null || _a === void 0 ? void 0 : _a.ovm) === null || _b === void 0 ? void 0 : _b.solcVersion) {
        ovmSolcVersion = hre.config.ovm.solcVersion;
    }
    // Get a path to a soljson file.
    const ovmSolcPath = await getOvmSolcPath(ovmSolcVersion);
    // These objects get fed into the compiler. We're creating two of these because we need to
    // throw one into the OVM compiler and another into the EVM compiler. Users are able to prevent
    // certain files from being compiled by the OVM compiler by adding "// @unsupported: ovm"
    // somewhere near the top of their file.
    const ovmInput = {
        language: 'Solidity',
        sources: {},
        settings: args.input.settings,
    };
    // Separate the EVM and OVM inputs.
    for (const file of Object.keys(args.input.sources)) {
        // Ignore any contract that has this tag.
        if (!args.input.sources[file].content.includes('// @unsupported: ovm')) {
            ovmInput.sources[file] = args.input.sources[file];
        }
    }
    // Build both inputs separately.
    const ovmOutput = await hre.run(task_names_1.TASK_COMPILE_SOLIDITY_RUN_SOLCJS, {
        input: ovmInput,
        solcJsPath: ovmSolcPath,
    });
    // Just doing this to add some extra useful information to any errors in the OVM compiler output.
    ovmOutput.errors = (ovmOutput.errors || []).map((error) => {
        if (error.severity === 'error') {
            error.formattedMessage = `OVM Compiler Error (insert "// @unsupported: ovm" if you don't want this file to be compiled for the OVM):\n ${error.formattedMessage}`;
        }
        return error;
    });
    return ovmOutput;
});
config_1.extendEnvironment((hre) => {
    if (hre.network.config.ovm) { // || process.env.TARGET // we could make it activate by env variable too but I would make it a less generic one than TARGET, more like OPTIMISM_TARGET
        hre.network.ovm = hre.network.config.ovm;
        let artifactsPath = hre.config.paths.artifacts;
        if (!artifactsPath.endsWith('-ovm')) {
            artifactsPath = artifactsPath + '-ovm';
        }
        let cachePath = hre.config.paths.cache;
        if (!cachePath.endsWith('-ovm')) {
            cachePath = cachePath + '-ovm';
        }
        // Forcibly update the artifacts object.
        hre.config.paths.artifacts = artifactsPath;
        hre.config.paths.cache = cachePath;
        hre.artifacts = new artifacts_1.Artifacts(artifactsPath);
    }
});
//# sourceMappingURL=index.js.map