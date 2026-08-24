public without sharing class Resource360OutboxPublisher implements Queueable {
    public void execute(QueueableContext context) {
        List<R360_Outbox_Event__c> pending = [
            SELECT Id, Event_ID__c, Correlation_ID__c, Event_Type__c, Aggregate_Type__c,
                Aggregate_ID__c, Aggregate_Version__c, Payload__c, State__c, Attempt_Count__c
            FROM R360_Outbox_Event__c
            WHERE State__c IN ('Pending', 'Retry Pending')
                AND (Next_Attempt_At__c = null OR Next_Attempt_At__c <= :System.now())
            LIMIT 50 FOR UPDATE
        ];
        if (pending.isEmpty()) return;

        List<R360_Outbox_Event__c> updates = new List<R360_Outbox_Event__c>();
        for (R360_Outbox_Event__c record : pending) {
            Resource360_Domain_Event__e domainEvent = new Resource360_Domain_Event__e(
                Event_ID__c = record.Event_ID__c,
                Correlation_ID__c = record.Correlation_ID__c,
                Event_Type__c = record.Event_Type__c,
                Aggregate_Type__c = record.Aggregate_Type__c,
                Aggregate_ID__c = record.Aggregate_ID__c,
                Aggregate_Version__c = record.Aggregate_Version__c,
                Payload__c = truncate(record.Payload__c, 4000)
            );
            Database.SaveResult result = EventBus.publish(domainEvent);
            record.Attempt_Count__c = valueOrZero(record.Attempt_Count__c) + 1;
            if (result.isSuccess()) {
                record.State__c = 'Published';
                record.Published_At__c = System.now();
                record.Last_Error__c = null;
            } else {
                applyFailure(record, result.getErrors().isEmpty() ? 'Platform event enqueue failed.' : result.getErrors()[0].getMessage());
            }
            updates.add(record);
        }
        update updates;
    }

    @TestVisible private static void applyFailure(R360_Outbox_Event__c record, String message) {
        Integer attempts = Integer.valueOf(record.Attempt_Count__c);
        record.Last_Error__c = truncate(message, 2000);
        Integer maximumAttempts=Integer.valueOf(Resource360Policy.numberValue('Outbox_Max_Attempts',3));if (attempts >= maximumAttempts) {
            record.State__c = 'Dead Letter';
            record.Next_Attempt_At__c = null;
        } else {
            record.State__c = 'Retry Pending';
            List<String>delays=Resource360Policy.listValue('Outbox_Retry_Minutes',new List<String>{'1','5','30'});Integer delayIndex=Math.min(Math.max(attempts-1,0),delays.size()-1);Integer delayMinutes=Integer.valueOf(delays[delayIndex]);
            record.Next_Attempt_At__c = System.now().addMinutes(delayMinutes);
        }
    }

    private static Decimal valueOrZero(Decimal value) { return value == null ? 0 : value; }
    private static String truncate(String value, Integer length) { return value != null && value.length() > length ? value.substring(0, length) : value; }
}
