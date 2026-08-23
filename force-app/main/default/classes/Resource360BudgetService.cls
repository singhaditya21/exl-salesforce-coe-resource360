public inherited sharing class Resource360BudgetService {
    public static Resource360Service.ServiceResult submit(Id budgetId) {
        String correlation = correlationId();
        Budget__c budget = budgetForUpdate(budgetId);
        if (budget.State__c != 'Draft' && budget.State__c != 'Rejected' && budget.State__c != 'Invalidated') {
            fail('Only a draft, rejected or invalidated budget can be submitted.');
        }
        requireCommercialReference(budget);
        List<Budget_Line__c> lines = budgetLines(budgetId);
        reconcileWbs(budget, lines);
        String signature = economicSignature(budget, lines);
        budget.Economic_Signature__c = signature;
        budget.Submitted_By__c = UserInfo.getUserId();
        budget.Submitted_At__c = System.now();
        budget.Policy_Version__c = 'R360-POLICY-1.1';
        budget.Approval_Step__c = 0;

        Decimal autoThreshold = Resource360Policy.numberValue('Budget_Auto_Approve_Margin', 30);
        if (budget.Margin_Percent__c >= autoThreshold) {
            budget.State__c = 'Approved';
            budget.Approval_Level__c = 'Auto-approved ≥' + String.valueOf(autoThreshold) + '%';
            budget.Decision_By__c = UserInfo.getUserId();
            budget.Decision_At__c = System.now();
            budget.Decision_Note__c = 'Auto-approved by effective Resource 360 margin policy.';
            update (Budget__c)Resource360Security.updateable(new List<SObject>{budget})[0];
            insertDecision(correlation, budget, 0, 'Resource 360 System', 'Approved', budget.Decision_Note__c, signature, UserInfo.getUserId());
            recordBudgetEvent(correlation, 'BUDGET_APPROVED', budget, 'AUTO_APPROVED', 'Budget auto-approved by configured margin policy.', 'Draft', 'Approved');
            return result(true, 'Budget auto-approved.', budget.Id, correlation);
        }

        List<String> roles = approvalRoles(budget.Margin_Percent__c);
        budget.State__c = 'Pending Approval';
        budget.Approval_Step__c = 1;
        budget.Approval_Level__c = 'Awaiting ' + roles[0];
        budget.Decision_By__c = null;
        budget.Decision_At__c = null;
        budget.Decision_Note__c = null;
        update (Budget__c)Resource360Security.updateable(new List<SObject>{budget})[0];
        insertDecision(correlation, budget, 1, roles[0], 'Pending', null, signature, null);
        recordBudgetEvent(correlation, 'BUDGET_SUBMITTED', budget, 'APPROVAL_REQUIRED', budget.Approval_Level__c, 'Draft', 'Pending Approval');
        return result(true, 'Budget submitted for ' + roles[0] + ' approval.', budget.Id, correlation);
    }

    public static Resource360Service.ServiceResult decide(Id budgetId, Boolean approve, String note) {
        Resource360Security.requirePermission('Resource360_Approve_Budgets', 'Budget Approver permission is required to decide budgets.');
        String correlation = correlationId();
        Budget__c budget = budgetForUpdate(budgetId);
        if (budget.State__c != 'Pending Approval') fail('Only a pending budget can be decided.');
        if (budget.Submitted_By__c == UserInfo.getUserId()) fail('A budget submitter cannot approve or reject their own budget at the same approval chain.');
        if ([SELECT COUNT() FROM R360_Approval_Decision__c WHERE Entity_Type__c='Budget__c' AND Entity_ID__c=:String.valueOf(budget.Id) AND Entity_Version__c=:budget.Version__c AND State__c='Approved' AND Approver__c=:UserInfo.getUserId()] > 0) fail('The same approver cannot complete more than one level in a budget approval chain.');
        if (!approve && String.isBlank(note)) fail('A rejection note is required.');
        String currentSignature = economicSignature(budget, budgetLines(budget.Id));
        if (String.isBlank(budget.Economic_Signature__c) || budget.Economic_Signature__c != currentSignature) {
            budget.State__c = 'Invalidated';
            budget.Approval_Level__c = 'Economics changed; resubmit required';
            budget.Approval_Step__c = 0;
            budget.Economic_Signature__c = null;
            update budget;
            recordBudgetEvent(correlation, 'BUDGET_INVALIDATED', budget, 'SIGNATURE_CHANGED', 'Budget economics changed after submission.', 'Pending Approval', 'Invalidated');
            fail('Budget economics changed after submission. Create or resubmit the current version.');
        }

        R360_Approval_Decision__c decision = [
            SELECT Id, State__c, Required_Role__c, Step_Number__c, Economic_Signature__c
            FROM R360_Approval_Decision__c
            WHERE Entity_Type__c = 'Budget__c' AND Entity_ID__c = :String.valueOf(budget.Id)
                AND Entity_Version__c = :budget.Version__c AND State__c = 'Pending'
            LIMIT 1 FOR UPDATE
        ];
        Set<String> roles = Resource360Security.activeRoles();
        if (!roles.contains('Administrator') && !roles.contains(decision.Required_Role__c)) {
            fail(decision.Required_Role__c + ' is the active required approval role.');
        }
        if (decision.Economic_Signature__c != budget.Economic_Signature__c) fail('The approval signature is stale.');
        decision.State__c = approve ? 'Approved' : 'Rejected';
        decision.Approver__c = UserInfo.getUserId();
        decision.Decided_At__c = System.now();
        decision.Decision_Note__c = String.isBlank(note) ? 'Approved by authorized approver.' : note.trim();
        update decision;

        if (!approve) {
            budget.State__c = 'Rejected';
            budget.Decision_By__c = UserInfo.getUserId();
            budget.Decision_At__c = System.now();
            budget.Decision_Note__c = decision.Decision_Note__c;
            update budget;
            recordBudgetEvent(correlation, 'BUDGET_REJECTED', budget, 'APPROVER_REJECTED', decision.Decision_Note__c, 'Pending Approval', 'Rejected');
            return result(true, 'Budget rejected.', budget.Id, correlation);
        }

        List<String> requiredRoles = approvalRoles(budget.Margin_Percent__c);
        Integer completedStep = Integer.valueOf(decision.Step_Number__c);
        if (completedStep < requiredRoles.size()) {
            Integer nextStep = completedStep + 1;
            String nextRole = requiredRoles[nextStep - 1];
            budget.Approval_Step__c = nextStep;
            budget.Approval_Level__c = 'Awaiting ' + nextRole;
            update budget;
            insertDecision(correlation, budget, nextStep, nextRole, 'Pending', null, budget.Economic_Signature__c, null);
            recordBudgetEvent(correlation, 'BUDGET_APPROVAL_STEP_COMPLETED', budget, 'STEP_APPROVED', decision.Required_Role__c + ' approved; awaiting ' + nextRole + '.', 'Pending Approval', 'Pending Approval');
            return result(true, decision.Required_Role__c + ' approved. ' + nextRole + ' approval is now required.', budget.Id, correlation);
        }

        budget.State__c = 'Approved';
        budget.Approval_Level__c = 'Approved · ' + String.join(requiredRoles, ' → ');
        budget.Decision_By__c = UserInfo.getUserId();
        budget.Decision_At__c = System.now();
        budget.Decision_Note__c = decision.Decision_Note__c;
        update budget;
        recordBudgetEvent(correlation, 'BUDGET_APPROVED', budget, 'CHAIN_COMPLETED', 'All required approval steps completed.', 'Pending Approval', 'Approved');
        return result(true, 'Budget approved.', budget.Id, correlation);
    }

    public static Resource360Service.ServiceResult createVersion(Id sourceBudgetId) {
        String correlation = correlationId();
        Budget__c source = budgetForUpdate(sourceBudgetId);
        List<Budget__c> currentVersions = [SELECT Id, Current__c FROM Budget__c WHERE Engagement__c = :source.Engagement__c AND Current__c = true FOR UPDATE];
        for (Budget__c current : currentVersions) current.Current__c = false;
        if (!currentVersions.isEmpty()) update currentVersions;
        Budget__c next = new Budget__c(
            Engagement__c=source.Engagement__c, Version__c=source.Version__c+1, State__c='Draft', Current__c=true,
            Revenue__c=source.Revenue__c, Base_Labour__c=source.Base_Labour__c, Uplift_Percent__c=source.Uplift_Percent__c,
            Effort_Contingency_Percent__c=source.Effort_Contingency_Percent__c,
            Expense_Contingency_Percent__c=source.Expense_Contingency_Percent__c,
            Travel_Rate__c=source.Travel_Rate__c, Onsite_Months__c=source.Onsite_Months__c,
            Planned_Hours__c=source.Planned_Hours__c, Policy_Version__c=source.Policy_Version__c
        );
        next.Approval_Step__c = 0;
        next.Approval_Level__c = null;
        next.Economic_Signature__c = null;
        next.Submitted_By__c = null;
        next.Submitted_At__c = null;
        next.Decision_By__c = null;
        next.Decision_At__c = null;
        next.Decision_Note__c = null;
        next.Idempotency_Key__c = correlation;
        insert next;
        List<Budget_Line__c> clonedLines = new List<Budget_Line__c>();
        for (Budget_Line__c line : budgetLines(source.Id)) {
            Budget_Line__c cloneLine = line.clone(false, false, false, false);
            cloneLine.Budget__c = next.Id;
            clonedLines.add(cloneLine);
        }
        if (!clonedLines.isEmpty()) insert clonedLines;
        recordBudgetEvent(correlation, 'BUDGET_VERSION_CREATED', next, 'VERSIONED_EDIT', 'New immutable budget working version created.', null, 'Draft');
        return result(true, 'Budget version ' + String.valueOf(next.Version__c) + ' created.', next.Id, correlation);
    }

    public static Budget__c currentApprovedBudget(Id engagementId, Date startDate, Date endDate) {
        List<Budget__c> budgets = [
            SELECT Id, Version__c, State__c, Current__c, Economic_Signature__c, Revenue__c,
                Base_Labour__c, Uplift_Percent__c, Effort_Contingency_Percent__c, Expense_Contingency_Percent__c,
                Travel_Rate__c, Onsite_Months__c, Planned_Hours__c, Margin_Percent__c, Engagement__c
            FROM Budget__c WHERE Engagement__c = :engagementId AND State__c = 'Approved' AND Current__c = true
            WITH USER_MODE LIMIT 1 FOR UPDATE
        ];
        if (budgets.isEmpty() || String.isBlank(budgets[0].Economic_Signature__c)) fail('A current approved, signed budget is required before staffing.');
        String signature = economicSignature(budgets[0], budgetLines(budgets[0].Id));
        if (signature != budgets[0].Economic_Signature__c) fail('The current approved budget signature is stale.');
        return budgets[0];
    }

    @TestVisible
    private static String economicSignature(Budget__c budget, List<Budget_Line__c> lines) {
        List<String> values = new List<String>{ String.valueOf(budget.Version__c), String.valueOf(budget.Revenue__c), String.valueOf(budget.Base_Labour__c), String.valueOf(budget.Uplift_Percent__c), String.valueOf(budget.Effort_Contingency_Percent__c), String.valueOf(budget.Expense_Contingency_Percent__c), String.valueOf(budget.Travel_Rate__c), String.valueOf(budget.Onsite_Months__c), String.valueOf(budget.Planned_Hours__c) };
        for (Budget_Line__c line : lines) values.add(String.join(new List<String>{String.valueOf(line.Period_Start__c), line.Phase__c, line.Work_Unit__c, line.Role__c, line.Location__c, String.valueOf(line.Planned_Hours__c), String.valueOf(line.Cost_Rate__c), String.valueOf(line.Allocation_Percent__c), String.valueOf(line.Onsite__c)}, '|'));
        return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(String.join(values, '||'))));
    }

    private static Budget__c budgetForUpdate(Id budgetId) {
        return [SELECT Id, Engagement__c, Engagement__r.Start_Date__c, Engagement__r.End_Date__c, State__c, Version__c, Current__c,
            Revenue__c, Base_Labour__c, Uplift_Percent__c, Effort_Contingency_Percent__c, Expense_Contingency_Percent__c,
            Travel_Rate__c, Onsite_Months__c, Planned_Hours__c, Margin_Percent__c, Economic_Signature__c,
            Submitted_By__c, Submitted_At__c, Approval_Step__c, Approval_Level__c, Policy_Version__c,
            Decision_By__c, Decision_At__c, Decision_Note__c, Idempotency_Key__c
            FROM Budget__c WHERE Id = :budgetId WITH USER_MODE LIMIT 1 FOR UPDATE];
    }

    private static List<Budget_Line__c> budgetLines(Id budgetId) {
        return [SELECT Id, Budget__c, Period_Start__c, Phase__c, Work_Unit__c, Role__c, Location__c, Planned_Hours__c, Cost_Rate__c, Allocation_Percent__c, Onsite__c FROM Budget_Line__c WHERE Budget__c = :budgetId WITH USER_MODE ORDER BY Period_Start__c, Phase__c, Role__c];
    }

    private static void reconcileWbs(Budget__c budget, List<Budget_Line__c> lines) {
        if (lines.isEmpty()) fail('Add at least one WBS budget line before submission.');
        Decimal total = 0;
        for (Budget_Line__c line : lines) total += line.Planned_Hours__c == null ? 0 : line.Planned_Hours__c;
        if ((total - budget.Planned_Hours__c).abs() > 0.01) fail('Budget planned hours must reconcile to WBS line planned hours.');
    }

    private static void requireCommercialReference(Budget__c budget) {
        Date today = Date.today();
        List<Commercial_Reference__c> references = [SELECT Id, Value__c FROM Commercial_Reference__c WHERE Engagement__c = :budget.Engagement__c AND Status__c = 'Active' AND Valid_From__c <= :today AND (Valid_To__c = null OR Valid_To__c >= :today) WITH USER_MODE ORDER BY Value__c DESC LIMIT 1];
        if (references.isEmpty()) fail('An active commercial reference is required before budget submission.');
        if (references[0].Value__c != null && budget.Revenue__c > references[0].Value__c) fail('Budget revenue exceeds the active commercial reference value.');
    }

    private static List<String> approvalRoles(Decimal margin) {
        List<String> roles = new List<String>{'Portfolio Manager'};
        if (margin < Resource360Policy.numberValue('Budget_HOD_Margin', 25)) roles.add('HOD');
        if (margin < Resource360Policy.numberValue('Budget_Executive_Margin', 20)) roles.add('GM/COO Delegate');
        return roles;
    }

    private static void insertDecision(String correlation, Budget__c budget, Integer step, String role, String state, String note, String signature, Id approver) {
        insert new R360_Approval_Decision__c(Decision_ID__c=correlation + '-BUD-' + step, Entity_Type__c='Budget__c', Entity_ID__c=String.valueOf(budget.Id), Entity_Version__c=budget.Version__c, Step_Number__c=step, Required_Role__c=role, State__c=state, Approver__c=approver, Decided_At__c=state == 'Pending' ? null : System.now(), Decision_Note__c=note, Economic_Signature__c=signature, Correlation_ID__c=correlation);
    }

    private static void recordBudgetEvent(String correlation, String eventType, Budget__c budget, String reasonCode, String detail, String beforeState, String afterState) {
        String role = Resource360Security.decisionRole('Resource360_Approve_Budgets', 'Budget Approver');
        Resource360AuditService.record(correlation, role, eventType, 'Budget__c', budget.Id, budget.Version__c, reasonCode, detail, Resource360AuditService.state(beforeState, null), Resource360AuditService.state(afterState, detail));
        Resource360EventService.enqueue(correlation, eventType, 'Budget__c', budget.Id, budget.Version__c, new Map<String, Object>{'state' => afterState, 'engagementId' => budget.Engagement__c, 'version' => budget.Version__c});
    }

    private static Resource360Service.ServiceResult result(Boolean success, String message, Id recordId, String correlation) { return new Resource360Service.ServiceResult(success, message, recordId, correlation); }
    private static String correlationId() { return EncodingUtil.convertToHex(Crypto.generateAesKey(128)); }
    private static void fail(String message) { throw new AuraHandledException(message); }
}
