trigger Resource360ApprovalImmutable on R360_Approval_Decision__c (before update, before delete) {
    if (Trigger.isDelete) {
        for (R360_Approval_Decision__c record : Trigger.old) record.addError('Approval decision evidence cannot be deleted.');
    } else {
        for (R360_Approval_Decision__c record : Trigger.new) {
            R360_Approval_Decision__c prior = Trigger.oldMap.get(record.Id);
            if (prior.State__c != 'Pending') record.addError('A completed approval decision is immutable.');
            if (record.Decision_ID__c != prior.Decision_ID__c || record.Entity_Type__c != prior.Entity_Type__c ||
                record.Entity_ID__c != prior.Entity_ID__c || record.Entity_Version__c != prior.Entity_Version__c ||
                record.Step_Number__c != prior.Step_Number__c || record.Required_Role__c != prior.Required_Role__c ||
                record.Correlation_ID__c != prior.Correlation_ID__c || record.Economic_Signature__c != prior.Economic_Signature__c) {
                record.addError('Approval identity, scope and signature are immutable.');
            }
        }
    }
}
