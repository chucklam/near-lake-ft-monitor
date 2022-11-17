#!/usr/bin/env ts-node

import { startStream, types } from 'near-lake-framework';

const lakeConfig: types.LakeConfig = {
  s3BucketName: "near-lake-data-mainnet",
  s3RegionName: "eu-central-1",
  startBlockHeight: 63804051,
};

interface EventLogData {
  standard: string, // 'nep141'
  version: string,  // '1.0.0'
  event: string,    // 'ft_transfer'
  data?: unknown,
};

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  const blockHeader = streamerMessage.block.header;
  const createdOn = new Date(blockHeader.timestamp / 1000000);

  // Collect Receipts and ExecutionOutcomes from StreamerMessage
  const receiptExecutionOutcomes = streamerMessage
    .shards
    .flatMap(shard => shard.receiptExecutionOutcomes);

  // Extract Outcomes with Event
  const outcomesWithEvents = receiptExecutionOutcomes
    .map(outcome => ({
      createdOn,
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
  
  // Filter for relevant events
  const relevantOutcomes = outcomesWithEvents
    .filter(outcome =>
      outcome.events.some(
        // event => event?.standard === "nep171" && event.event === "nft_mint"
        event => event?.standard === 'nep141' && event.event === 'ft_transfer'
      )
    );

  if (relevantOutcomes.length > 0) {
    relevantOutcomes.forEach(outcome => console.dir(outcome, { depth: 5 }));
  }
}

(async () => {
  await startStream(lakeConfig, handleStreamerMessage);
})();
