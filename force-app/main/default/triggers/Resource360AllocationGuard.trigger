trigger Resource360AllocationGuard on Allocation__c (before insert,before update,after insert,after update) {
    if(Trigger.isBefore)Resource360CapacityService.validateBefore(Trigger.new,Trigger.isUpdate?Trigger.oldMap:null);
    if(Trigger.isAfter){Set<Id>resourceIds=new Set<Id>();for(Allocation__c allocation:Trigger.new)if(allocation.Resource__c!=null)resourceIds.add(allocation.Resource__c);if(Trigger.isUpdate)for(Allocation__c allocation:Trigger.old)if(allocation.Resource__c!=null)resourceIds.add(allocation.Resource__c);Resource360CapacityService.refreshToday(resourceIds);}
}
