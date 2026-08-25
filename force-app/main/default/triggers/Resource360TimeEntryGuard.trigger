trigger Resource360TimeEntryGuard on Time_Entry__c (before update, before delete) {
    if (Trigger.isDelete) {
        for (Time_Entry__c record : Trigger.old) if (record.State__c == 'Approved') record.addError('Approved time is immutable; create a controlled correction instead.');
    } else {
        for (Time_Entry__c record : Trigger.new) if (Trigger.oldMap.get(record.Id).State__c == 'Approved') record.addError('Approved time is immutable; create a controlled correction instead.');
    }
}
