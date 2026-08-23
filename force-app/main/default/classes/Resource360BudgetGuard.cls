public without sharing class Resource360BudgetGuard {
    public static void beforeUpdate(List<Budget__c> records, Map<Id, Budget__c> oldMap) {
        for (Budget__c current : records) {
            Budget__c prior = oldMap.get(current.Id);
            if (prior.State__c == 'Approved' && economicFieldsChanged(current, prior)) {
                current.State__c = 'Invalidated';
                current.Economic_Signature__c = null;
                current.Approval_Level__c = 'Reapproval required';
                current.Approval_Step__c = 0;
            }
        }
    }

    public static void invalidateForLines(Set<Id> budgetIds) {
        if (budgetIds.isEmpty()) return;
        List<Budget__c> budgets = [
            SELECT Id, State__c, Version__c FROM Budget__c
            WHERE Id IN :budgetIds AND State__c = 'Approved' FOR UPDATE
        ];
        String correlation = correlationId();
        for (Budget__c budget : budgets) {
            budget.State__c = 'Invalidated';
            budget.Economic_Signature__c = null;
            budget.Approval_Level__c = 'WBS changed; reapproval required';
            budget.Approval_Step__c = 0;
        }
        if (!budgets.isEmpty()) {
            update budgets;
            for (Budget__c budget : budgets) {
                Resource360AuditService.record(correlation, 'Resource 360 System', 'BUDGET_INVALIDATED', 'Budget__c', budget.Id, budget.Version__c, 'WBS_CHANGED', 'Approved budget invalidated by WBS line change.', Resource360AuditService.state('Approved', null), Resource360AuditService.state('Invalidated', 'WBS changed'));
            }
        }
    }

    private static Boolean economicFieldsChanged(Budget__c a, Budget__c b) {
        return a.Revenue__c != b.Revenue__c || a.Base_Labour__c != b.Base_Labour__c ||
            a.Uplift_Percent__c != b.Uplift_Percent__c || a.Effort_Contingency_Percent__c != b.Effort_Contingency_Percent__c ||
            a.Expense_Contingency_Percent__c != b.Expense_Contingency_Percent__c || a.Travel_Rate__c != b.Travel_Rate__c ||
            a.Onsite_Months__c != b.Onsite_Months__c || a.Planned_Hours__c != b.Planned_Hours__c;
    }
    private static String correlationId() { return EncodingUtil.convertToHex(Crypto.generateAesKey(128)); }
}
