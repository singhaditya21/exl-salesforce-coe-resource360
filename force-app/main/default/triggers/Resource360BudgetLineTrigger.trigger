trigger Resource360BudgetLineTrigger on Budget_Line__c (before insert, before update, before delete, after insert, after update, after delete, after undelete) {
    if (Trigger.isBefore) {
        Resource360BudgetGuard.protectHistoricalLines(Trigger.isDelete ? Trigger.old : Trigger.new);
    }
    if (Trigger.isAfter) {
        Set<Id> budgetIds = new Set<Id>();
        List<Budget_Line__c> source = Trigger.isDelete ? Trigger.old : Trigger.new;
        for (Budget_Line__c line : source) if (line.Budget__c != null) budgetIds.add(line.Budget__c);
        Resource360BudgetGuard.invalidateForLines(budgetIds);
    }
}
