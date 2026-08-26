trigger Resource360CapacityLedgerGuard on R360_Daily_Capacity__c (before insert,before update,before delete,after undelete) {
    if(!Resource360CapacityService.isReconciliationContext()){
        List<R360_Daily_Capacity__c>records=Trigger.isDelete?Trigger.old:Trigger.new;
        for(R360_Daily_Capacity__c record:records)record.addError('Daily capacity ledger rows are transactionally derived from accepted allocations and cannot be edited directly.');
    }
}
