# %%
import requests
import json
import pandas as pd
# %%
block_query = """query blocks {
  blocks(
    first: 1
    orderBy: number
    orderDirection: desc
  )
  {
    number
  }
}
"""
#%%
url = 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-blocks'
r = requests.post(url, json={'query': block_query})
data = r.json()
number = str(data["data"]["blocks"][0]["number"])
print(number)
# %%
query = """query pools {
  pools(
    block: {number: """ + number + """}
    orderBy: totalValueLockedUSD
    orderDirection: desc
    subgraphError: allow
  ) {
    id
    feeTier
    liquidity
    sqrtPrice
    tick
    token0 {
      id
      symbol
      decimals
    }
    token1 {
      id
      symbol
      decimals
    }
    volumeToken0
    token0Price
    volumeToken1
    token1Price
    volumeUSD
    txCount
    totalValueLockedToken0
    totalValueLockedToken1
    totalValueLockedUSD
  }
}
"""

# %%
url = 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-optimism-dev'
r = requests.post(url, json={'query': query})
# %%
data = r.json()

# %%
df = pd.DataFrame(data["data"]["pools"])
df.head()

# %%
df['token0_decimals'] = [d.get('decimals') for d in df.token0]
df['token0_name'] = [d.get('symbol') for d in df.token0]
df['token0_id'] = [d.get('id') for d in df.token0]
df.drop('token0', inplace=True, axis = 1)
df['token1_decimals'] = [d.get('decimals') for d in df.token1]
df['token1_name'] = [d.get('symbol') for d in df.token1]
df['token1_id'] = [d.get('id') for d in df.token1]
df.drop('token1', inplace=True, axis = 1)
df.head()
# %%
pair_dict = {}
for index, row in df.iterrows():
    pair_name = row['token0_name'] + '-' + row['token1_name']
    if pair_name not in pair_dict:
      pair_dict[pair_name] = pd.DataFrame()
      pair_dict[pair_name] = pair_dict[pair_name].append(row)
    else:
      pair_dict[pair_name] = pair_dict[pair_name].append(row)
# %%
profit_df = pd.DataFrame()
for key, value in pair_dict.items():
  for index1, row1 in value.iterrows():
    for index2, row2 in value.iterrows():
      if index1 == index2:
        continue
      elif index1 > index2:
        continue
      else:
        L2 = float(row1['liquidity']) / 2**128 * (10 ** 18)
        L1 = float(row2['liquidity']) / 2**128 * (10 ** 18)
        sqrtp2 = float(row1['token1Price']) ** (1/2)
        sqrtp1 = float(row2['token1Price']) ** (1/2)
        if L1 == 0 or L2 == 0 or sqrtp1 == 0 or sqrtp2 == 0:
          continue
        x1 = L1 / sqrtp1
        y1 = L1 * sqrtp1
        x2 = L2 / sqrtp2
        y2 = L2 * sqrtp2
        gamma2 = float(row1['feeTier']) * (10 ** (-1 * 6))
        gamma1 = float(row2['feeTier']) * (10 ** (-1 * 6))
        if (-2*L2*gamma1+L2*gamma1**2+L2 == 0):
          yin = 0
        else:
          yin = (L1*(sqrtp1)*L2*gamma1 - L1*(sqrtp1)*L2 + y1*L2*gamma1 - y1*L2 - L1*(sqrtp2)*L2*gamma1 + L1*(sqrtp2)*L2 + ((-1*L1*(sqrtp1)*L2*gamma1 + L1*(sqrtp1)*L2 - y1*L2*gamma1 + y1*L2 + L1*(sqrtp2)*L2*gamma1 - L1*(sqrtp2)*L2)**2 - 4*(L2*gamma1**2 - 2*L2*gamma1 + L2)*(y1*L1*(sqrtp1)*L2 - y1*L1*(sqrtp2)*L2 + y1*x1*L1*gamma2 - y1*x1*L1))**(1/2))/(2*(L2*gamma1**2 - 2*L2*gamma1 + L2))
        xend1 = (x2*y2)/(y2+(1*(1-gamma2)))
        xend = (x2/y2)/(y2+(((x1*y1)/(y1+(yin*(1-gamma1))))*(1-gamma2)))
        profit_amount = (xend - yin) - ((yin)* .009) - .003
        profit_df = profit_df.append({
          'token0_addr': row1['token0_id'],
          'token0': row1['token0_name'],
          'token1_addr': row1['token1_id'],
          'token1': row1['token1_name'],
          'Pool 0 ID': row1['id'],
          'Pool 1 ID': row2['id'],
          'Swap From Fee': row1['feeTier'],
          'Swap To Fee': row2['feeTier'],
          'Amount To Send': yin,
          'Profit': profit_amount
        }, ignore_index=True)
for index, row in profit_df.iterrows():
  if row['Amount To Send'] < .01 or row['Profit'] <= 0:
    profit_df.drop(index, inplace=True)
profit_df = profit_df.sort_values(by = 'Profit', ascending = False).reset_index(drop=True)
profit_df.head()
# %%
import os
os.system('npx hardhat run -network "optimistic-kovan" scripts/interact.js -- -' + str(profit_df['token0_addr'][0]) + ' -' + str(profit_df['token1_addr'][0]) + ' -' + str(profit_df['Swap From Fee'][0]) + ' -' + str(profit_df['Amount To Send'][0]) + ' -0 -' + str(profit_df['Swap To Fee'][0]) + ' -0')

