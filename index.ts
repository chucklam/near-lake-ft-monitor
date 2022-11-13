#!/usr/bin/env ts-node

import { startStream, types } from 'near-lake-framework';

const lakeConfig: types.LakeConfig = {
  s3BucketName: "near-lake-data-mainnet",
  s3RegionName: "eu-central-1",
  startBlockHeight: 63804051,
};

interface EventLogData {
  standard: string,
  version: string,
  event: string,
  data?: unknown,
};

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  const blockHeader = streamerMessage.block.header;
  console.log(`Block #${blockHeader.height}`);

  // Collect Receipts and ExecutionOutcomes from StreamerMessage
  const receiptExecutionOutcomes = streamerMessage
    .shards
    .flatMap(shard => shard.receiptExecutionOutcomes);
  console.log(receiptExecutionOutcomes);

  const relevantOutcomes = receiptExecutionOutcomes
    .map(outcome => ({
      receipt: {
        id: outcome.receipt?.receiptId,
        receiverId: outcome.receipt?.receiverId,
      },
      events: outcome.executionOutcome.outcome.logs.map(
        (log: string): EventLogData | undefined => {
          const [_, probablyEvent] = log.match(/^EVENT_JSON:(.*)$/) ?? []
          try {
            return JSON.parse(probablyEvent)
          } catch (e) {
            return
          }
        }
      )
      .filter(event => event !== undefined)
    }))
    .filter(relevantOutcome =>
      relevantOutcome.events.some(
        event => event?.standard === "nep171" && event.event === "nft_mint"
      )
    );

  relevantOutcomes.length && console.dir(relevantOutcomes, { depth: 10 });
}

(async () => {
  await startStream(lakeConfig, handleStreamerMessage);
})();
