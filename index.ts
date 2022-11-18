#!/usr/bin/env ts-node

import { startStream, types } from 'near-lake-framework';

const lakeConfig: types.LakeConfig = {
  s3BucketName: "near-lake-data-mainnet",
  s3RegionName: "eu-central-1",
  startBlockHeight: 78648779,
};

// USDC contract
const contractAddress =
  'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near';

const decodeBase64 = (base64: string): string => {
  const buff = Buffer.from(base64, 'base64');
  return buff.toString('utf8');
};

interface FunctionCallAction {
  FunctionCall: {
    args: string;
    methodName: string;
    deposit?: string;
    gas?: number;
    arguments?: { [key: string]: string }; // Decoded version of `args`
  };
};

const isFunctionCallAction = (action: any): action is FunctionCallAction => {
  return ('FunctionCall' in action)
    && ('args' in action.FunctionCall)
    && (typeof action.FunctionCall.args === 'string')
    && ('methodName' in action.FunctionCall)
    && (typeof action.FunctionCall.methodName === 'string')
}

const decodeTx = (tx: types.IndexerTransactionWithOutcome) => {
  tx.transaction.actions.forEach(action => {
    if (isFunctionCallAction(action)) {
      const decodedArgs = decodeBase64(action.FunctionCall.args);
      try {
        action.FunctionCall.arguments = JSON.parse(decodedArgs);
      } catch (_) {}
    }
  });

  return tx;
};

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  const blockHeader = streamerMessage.block.header;
  const createdOn = new Date(blockHeader.timestamp / 1000000);
  
  const blockHeight = blockHeader.height;
  if (blockHeight > 78648779) process.exit();

  const txs = streamerMessage
    .shards
    .flatMap(shard => shard.chunk?.transactions);

  const relevantTxs = txs
    .filter(tx => tx?.transaction.receiverId === contractAddress)
    .map(tx => tx && decodeTx(tx));

  if (relevantTxs.length > 0) {
    relevantTxs.forEach(tx => console.dir(tx, { depth: 6 }));
  }
}

(async () => {
  await startStream(lakeConfig, handleStreamerMessage);
})();
