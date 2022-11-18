#!/usr/bin/env ts-node

import { startStream, types } from 'near-lake-framework';

const lakeConfig: types.LakeConfig = {
  s3BucketName: "near-lake-data-mainnet",
  s3RegionName: "eu-central-1",
  startBlockHeight: 78648779,
};

const filter = {
  // USDC contract
  contractAddress: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
  methodName: 'ft_transfer',
}

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
  // const createdOn = new Date(blockHeader.timestamp / 1000000);
  
  // const blockHeight = blockHeader.height;
  // if (blockHeight > 78648779) process.exit();

  const txs = streamerMessage
    .shards
    .flatMap(shard => shard.chunk?.transactions);

  const relevantTxs = txs
    .filter(tx => tx?.transaction.receiverId === filter.contractAddress)
    .filter(tx => tx?.transaction.actions.some(action => (
      isFunctionCallAction(action)
      && action.FunctionCall.methodName === filter.methodName
    )))
    // Decode the arguments of the method call now that we know it's the right method
    .map(tx => tx && decodeTx(tx));

  // Logging
  relevantTxs.forEach(tx => {
    // console.dir(tx, { depth: 6 });

    tx?.transaction.actions.forEach(action => {
      if (isFunctionCallAction(action) && action.FunctionCall.arguments
        && ('amount' in action.FunctionCall.arguments)
        && ('receiver_id' in action.FunctionCall.arguments)
      ) {
        const { amount, receiver_id } = action.FunctionCall.arguments;
        const usdc = parseFloat(amount) / (10**6);
        console.log(`${tx.transaction.signerId} sent ${usdc} USDC to ${receiver_id}`);
      }
    })
  });
}

(async () => {
  await startStream(lakeConfig, handleStreamerMessage);
})();
