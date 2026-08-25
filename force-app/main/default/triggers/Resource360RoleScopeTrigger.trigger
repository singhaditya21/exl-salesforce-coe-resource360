trigger Resource360RoleScopeTrigger on R360_Role_Scope__c (
    before insert, before update, after insert, after update, after delete, after undelete
) {
    if (Trigger.isBefore) {
        Resource360RoleScopeService.validate(Trigger.new, Trigger.isUpdate ? Trigger.oldMap : null);
    }
    if (Trigger.isAfter && !Resource360RoleScopeService.suppressSharingRebuild) {
        Set<Id> userIds = new Set<Id>();
        if (Trigger.isDelete || Trigger.isUpdate) {
            for (R360_Role_Scope__c record : Trigger.old) if (record.User__c != null) userIds.add(record.User__c);
        }
        if (!Trigger.isDelete) {
            for (R360_Role_Scope__c record : Trigger.new) if (record.User__c != null) userIds.add(record.User__c);
        }
        if (!userIds.isEmpty()) System.enqueueJob(new Resource360ScopeSharingJob(userIds));
    }
}
