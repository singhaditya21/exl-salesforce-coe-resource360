public without sharing class Resource360EventService {
    public class NotificationRequest { public String correlationId;public Id recipientId;public String title;public String message;public String severity;public String deepLink;public NotificationRequest(String correlationId,Id recipientId,String title,String message,String severity,String deepLink){this.correlationId=correlationId;this.recipientId=recipientId;this.title=title;this.message=message;this.severity=severity;this.deepLink=deepLink;} }
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

    public static Integer enqueueNotifications(List<NotificationRequest> requests){if(requests==null||requests.isEmpty())return 0;Map<String,R360_Outbox_Event__c>byEventId=new Map<String,R360_Outbox_Event__c>();for(NotificationRequest request:requests){if(request.recipientId==null)continue;String eventId=stableKey(request.correlationId+'|NOTIFICATION_REQUESTED|'+String.valueOf(request.recipientId));byEventId.put(eventId,new R360_Outbox_Event__c(Event_ID__c=eventId,Correlation_ID__c=request.correlationId,Event_Type__c='NOTIFICATION_REQUESTED',Aggregate_Type__c='User',Aggregate_ID__c=String.valueOf(request.recipientId),Aggregate_Version__c=1,Payload__c=JSON.serialize(new Map<String,Object>{'recipientId'=>request.recipientId,'title'=>request.title,'message'=>request.message,'severity'=>request.severity,'deepLink'=>request.deepLink}),State__c='Pending',Attempt_Count__c=0,Next_Attempt_At__c=System.now()));}if(byEventId.isEmpty())return 0;Set<String>eventIds=byEventId.keySet();Set<String>existing=new Set<String>();for(R360_Outbox_Event__c row:[SELECT Event_ID__c FROM R360_Outbox_Event__c WHERE Event_ID__c IN:eventIds])existing.add(row.Event_ID__c);List<R360_Outbox_Event__c>inserts=new List<R360_Outbox_Event__c>();for(String eventId:eventIds)if(!existing.contains(eventId))inserts.add(byEventId.get(eventId));if(!inserts.isEmpty())Database.insert(inserts,false);return inserts.size();}

    private static String stableKey(String value) { return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(value))); }
}
