trigger Resource360BudgetTrigger on Budget__c (before update) {
    Resource360BudgetGuard.beforeUpdate(Trigger.new, Trigger.oldMap);
}
