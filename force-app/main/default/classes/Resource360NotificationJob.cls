public without sharing class Resource360NotificationJob implements Queueable {
    private final Id outboxId;

    public Resource360NotificationJob(Id outboxId) { this.outboxId = outboxId; }

    public void execute(QueueableContext context) {
        R360_Outbox_Event__c outbox = [
            SELECT Id, Event_ID__c, Payload__c, Attempt_Count__c, State__c
            FROM R360_Outbox_Event__c WHERE Id = :outboxId LIMIT 1 FOR UPDATE
        ];
        try {
            Map<String, Object> payload = (Map<String, Object>)JSON.deserializeUntyped(outbox.Payload__c);
            insert new R360_Notification__c(
                Event_ID__c = stableKey(outbox.Event_ID__c + '|delivery'),
                Recipient__c = (Id)String.valueOf(payload.get('recipientId')),
                Title__c = truncate((String)payload.get('title'), 120),
                Message__c = truncate((String)payload.get('message'), 1000),
                Severity__c = String.isBlank((String)payload.get('severity')) ? 'Normal' : (String)payload.get('severity'),
                State__c = 'Delivered',
                Read__c = false,
                Deep_Link__c = truncate((String)payload.get('deepLink'), 255),
                Occurred_At__c = System.now()
            );
            outbox.State__c = 'Delivered';
            outbox.Published_At__c = System.now();
            outbox.Last_Error__c = null;
        } catch (Exception failure) {
            outbox.Attempt_Count__c = (outbox.Attempt_Count__c == null ? 0 : outbox.Attempt_Count__c) + 1;
            outbox.Last_Error__c = truncate(failure.getMessage(), 2000);
            Integer attempts=Integer.valueOf(outbox.Attempt_Count__c);Integer maximumAttempts=Integer.valueOf(Resource360Policy.numberValue('Outbox_Max_Attempts',3));outbox.State__c = attempts >= maximumAttempts ? 'Dead Letter' : 'Retry Pending';
            List<String>delays=Resource360Policy.listValue('Outbox_Retry_Minutes',new List<String>{'1','5','30'});Integer delayIndex=Math.min(Math.max(attempts-1,0),delays.size()-1);outbox.Next_Attempt_At__c = outbox.State__c == 'Retry Pending' ? System.now().addMinutes(Integer.valueOf(delays[delayIndex])) : null;
        }
        update outbox;
    }

    private static String stableKey(String value) { return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(value))); }
    private static String truncate(String value, Integer length) { return value != null && value.length() > length ? value.substring(0, length) : value; }
}
