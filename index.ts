#!/usr/bin/env ts-node

import { startStream, types } from 'near-lake-framework';
import { exit } from 'process';

const lakeConfig: types.LakeConfig = {
  s3BucketName: "near-lake-data-mainnet",
  s3RegionName: "eu-central-1",
  startBlockHeight: 78648779,
};

// interface EventLogData {
//   standard: string, // 'nep141'
//   version: string,  // '1.0.0'
//   event: string,    // 'ft_transfer'
//   data?: unknown,
// };

const decodeBase64 = (base64: string): string => {
  const buff = Buffer.from(base64, 'base64');
  return buff.toString('utf8');
};

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  const blockHeader = streamerMessage.block.header;
  const createdOn = new Date(blockHeader.timestamp / 1000000);
  
  const blockHeight = blockHeader.height;
  // if (blockHeight > 78648779) process.exit();

  const relevantTxs = streamerMessage
    .shards
    .flatMap(shard => shard.chunk?.transactions)
    .map(tx => tx?.transaction)
    // USDC contract
    .filter(tx => tx?.receiverId === 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near')
    .map(tx => ({
      ...tx,
      actions: tx?.actions && [...tx?.actions.map((action: any) => ({
        ...action,
        FunctionCall: {
          ...action?.FunctionCall,
          arguments: JSON.parse(decodeBase64(action?.FunctionCall.args)),
        }
      }))]
    }));

  if (relevantTxs.length > 0) {
    relevantTxs.forEach(tx => console.dir(tx, { depth: 6 }));
  }
}

(async () => {
  await startStream(lakeConfig, handleStreamerMessage);
})();
