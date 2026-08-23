public without sharing class Resource360EventService {
    public static Id enqueue(String correlationId, String eventType, String aggregateType, Id aggregateId, Decimal aggregateVersion, Map<String, Object> allowlistedPayload) {
        String eventId = stableKey(correlationId + '|' + eventType + '|' + String.valueOf(aggregateId));
        R360_Outbox_Event__c eventRecord = new R360_Outbox_Event__c(
            Event_ID__c = eventId,
            Correlation_ID__c = correlationId,
            Event_Type__c = eventType,
            Aggregate_Type__c = aggregateType,
            Aggregate_ID__c = String.valueOf(aggregateId),
            Aggregate_Version__c = aggregateVersion == null ? 1 : aggregateVersion,
            Payload__c = allowlistedPayload == null ? null : JSON.serialize(allowlistedPayload),
            State__c = 'Pending',
            Attempt_Count__c = 0,
            Next_Attempt_At__c = System.now()
        );
        insert eventRecord;
        if (!System.isQueueable() && !System.isBatch() && !System.isFuture() && !System.isScheduled()) {
            System.enqueueJob(new Resource360OutboxPublisher());
        }
        return eventRecord.Id;
    }

    public static Id enqueueNotification(String correlationId, Id recipientId, String title, String message, String severity, String deepLink) {
        Map<String, Object> payload = new Map<String, Object>{
            'recipientId' => recipientId,
            'title' => title,
            'message' => message,
            'severity' => severity,
            'deepLink' => deepLink
        };
        Id outboxId = enqueue(correlationId, 'NOTIFICATION_REQUESTED', 'User', recipientId, 1, payload);
        if (!System.isQueueable() && !System.isBatch() && !System.isFuture() && !System.isScheduled()) {
            System.enqueueJob(new Resource360NotificationJob(outboxId));
        }
        return outboxId;
    }

    private static String stableKey(String value) { return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(value))); }
}
