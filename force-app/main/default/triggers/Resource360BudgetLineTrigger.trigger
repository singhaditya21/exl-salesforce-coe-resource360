trigger Resource360BudgetLineTrigger on Budget_Line__c (after insert, after update, after delete, after undelete) {
    Set<Id> budgetIds = new Set<Id>();
    List<Budget_Line__c> source = Trigger.isDelete ? Trigger.old : Trigger.new;
    for (Budget_Line__c line : source) if (line.Budget__c != null) budgetIds.add(line.Budget__c);
    Resource360BudgetGuard.invalidateForLines(budgetIds);
}
