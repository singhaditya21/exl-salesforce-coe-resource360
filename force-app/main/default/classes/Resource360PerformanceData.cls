public without sharing class Resource360PerformanceData {
    @AuraEnabled
    public static Map<String, Integer> seed() {
        ensure();
        return new Map<String, Integer>{
            'kpiSnapshots' => [SELECT COUNT() FROM R360_KPI_Snapshot__c],
            'unavailability' => [SELECT COUNT() FROM R360_Resource_Unavailability__c]
        };
    }

    public static void ensure() {
        Date today = Date.today();
        DateTime cutoff = System.now();
        List<R360_KPI_Snapshot__c> priorDemoSnapshots = [SELECT Id FROM R360_KPI_Snapshot__c WHERE Policy_Version__c='R360-KPI-1.0' LIMIT 1000];
        if (!priorDemoSnapshots.isEmpty()) delete priorDemoSnapshots;
        List<R360_Portfolio__c> portfolios = [SELECT Id, Name, Portfolio_ID__c FROM R360_Portfolio__c ORDER BY Portfolio_ID__c LIMIT 10];
        List<Engagement__c> engagements = [SELECT Id, Name, Engagement_ID__c, End_Date__c FROM Engagement__c ORDER BY Engagement_ID__c LIMIT 20];
        List<Resource__c> resources = [
            SELECT Id, Employee_ID__c, Allocated_Daily_Hours__c, Capacity_Status__c
            FROM Resource__c WHERE Status__c='Active' ORDER BY Employee_ID__c LIMIT 60
        ];

        List<R360_KPI_Snapshot__c> snapshots = new List<R360_KPI_Snapshot__c>();
        for (Integer week = 0; week < 13; week++) {
            Date period = today.addDays(week * 7);
            Decimal availableHours = 480 - Math.mod(week, 4) * 8;
            Decimal committedHours = Math.max(360, 500 - week * 11);
            Decimal softDemandHours = 34 + Math.mod(week * 9, 52);
            Decimal forecastDemandHours = committedHours + softDemandHours;
            Decimal rollOffHours = week < 2 ? 0 : 16 + Math.mod(week * 13, 64);
            Decimal benchHours = Math.max(0, availableHours - committedHours);
            Decimal overageHours = Math.max(0, committedHours - availableHours);
            snapshots.add(metric('CAPACITY_COVERAGE_13W', '13-week capacity coverage', period, 'Forecast Week', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', availableHours, forecastDemandHours, percent(availableHours, forecastDemandHours), 100, 'Percent', percent(availableHours, forecastDemandHours) >= 100 ? 'On Target' : 'Watch', true, cutoff, 'Available productive hours divided by committed plus soft forecast demand.', 'Head of Delivery'));
            snapshots.add(metric('COMMITTED_HOURS', 'Committed capacity hours', period, 'Forecast Week', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', committedHours, 1, committedHours, 480, 'Hours', committedHours <= 480 ? 'On Target' : 'Watch', true, cutoff, 'Accepted allocation hours effective in the forecast week.', 'COE Staffer'));
            snapshots.add(metric('FORECAST_DEMAND_HOURS', 'Forecast demand hours', period, 'Forecast Week', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', forecastDemandHours, 1, forecastDemandHours, 480, 'Hours', forecastDemandHours <= availableHours ? 'On Target' : 'At Risk', true, cutoff, 'Committed demand plus governed soft staffing demand.', 'COE Staffer'));
            snapshots.add(metric('EXPECTED_ROLL_OFF_HOURS', 'Expected roll-off hours', period, 'Forecast Week', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', rollOffHours, 1, rollOffHours, 48, 'Hours', rollOffHours <= 48 ? 'On Target' : 'Watch', true, cutoff, 'Accepted allocation hours expected to release during the week.', 'Portfolio Manager'));
            snapshots.add(metric('BENCH_HOURS', 'Forecast bench hours', period, 'Forecast Week', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', benchHours, availableHours, benchHours, 40, 'Hours', benchHours <= 40 ? 'On Target' : 'Watch', true, cutoff, 'Available productive capacity not covered by committed demand.', 'Head of Delivery'));
            snapshots.add(metric('OVERALLOCATION_EXPOSURE_HOURS', 'Over-allocation exposure', period, 'Forecast Week', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', overageHours, availableHours, overageHours, 24, 'Hours', overageHours <= 24 ? 'On Target' : 'At Risk', true, cutoff, 'Committed hours above standard productive capacity; approval evidence remains mandatory.', 'Head of Delivery'));
        }

        List<String> historyCodes = new List<String>{'BILLED_UTILIZATION','BENCH_AGE_DAYS','FULFILMENT_RATE','TIME_TO_STAFF_DAYS','SCHEDULE_VARIANCE_DAYS','CPI','MARGIN_EROSION_PTS','DATA_QUALITY_SCORE'};
        List<String> historyLabels = new List<String>{'Billed utilization','Median bench age','Demand fulfilment rate','Median time to staff','Schedule variance','Cost performance index','Margin erosion','Data quality score'};
        List<String> historyUnits = new List<String>{'Percent','Days','Percent','Days','Days','Ratio','Points','Percent'};
        List<Decimal> targets = new List<Decimal>{75,14,92,3,0,1,2,98};
        for (Integer month = 11; month >= 0; month--) {
            Date period = today.addMonths(-month).toStartOfMonth();
            Integer sequence = 11 - month;
            List<Decimal> values = new List<Decimal>{72 + sequence * 0.7, Math.max(4, 19 - sequence), 84 + sequence * 0.8, Math.max(1.8, 4.6 - sequence * 0.2), Math.max(-2, 7 - sequence), 0.91 + sequence * 0.009, Math.max(0.8, 4.1 - sequence * 0.25), 93 + sequence * 0.5};
            for (Integer index = 0; index < historyCodes.size(); index++) {
                Boolean lowerIsBetter = new Set<String>{'BENCH_AGE_DAYS','TIME_TO_STAFF_DAYS','SCHEDULE_VARIANCE_DAYS','MARGIN_EROSION_PTS'}.contains(historyCodes[index]);
                Boolean good = lowerIsBetter ? values[index] <= targets[index] : values[index] >= targets[index];
                snapshots.add(metric(historyCodes[index], historyLabels[index], period, 'Monthly', 'Enterprise', 'EXL-SFCOE', 'EXL Salesforce COE', values[index], 1, values[index], targets[index], historyUnits[index], good ? 'On Target' : 'Watch', false, cutoff, historyLabels[index] + ' under the approved Resource 360 semantic definition.', ownerFor(historyCodes[index])));
            }
        }

        for (Integer index = 0; index < portfolios.size(); index++) {
            R360_Portfolio__c portfolio = portfolios[index];
            List<String> codes = new List<String>{'MANDATORY_SKILL_COVERAGE','ROLE_READINESS','HIGH_RISK_AGE','FORECAST_ACCURACY'};
            List<String> labels = new List<String>{'Mandatory skill coverage','Role readiness','High-risk aging','Forecast accuracy'};
            List<String> units = new List<String>{'Percent','Percent','Days','Percent'};
            List<Decimal> values = new List<Decimal>{88 + Math.mod(index * 3, 12), 84 + Math.mod(index * 5, 15), 7 + Math.mod(index * 4, 28), 86 + Math.mod(index * 7, 13)};
            List<Decimal> portfolioTargets = new List<Decimal>{95,90,21,90};
            for (Integer metricIndex = 0; metricIndex < codes.size(); metricIndex++) {
                Boolean good = codes[metricIndex] == 'HIGH_RISK_AGE' ? values[metricIndex] <= portfolioTargets[metricIndex] : values[metricIndex] >= portfolioTargets[metricIndex];
                R360_KPI_Snapshot__c item = metric(codes[metricIndex], labels[metricIndex], today, 'Daily', 'Portfolio', portfolio.Portfolio_ID__c, portfolio.Name, values[metricIndex], 100, values[metricIndex], portfolioTargets[metricIndex], units[metricIndex], good ? 'On Target' : 'Watch', false, cutoff, labels[metricIndex] + ' for the governed portfolio scope.', codes[metricIndex] == 'HIGH_RISK_AGE' ? 'Project Manager' : 'Portfolio Manager');
                item.Portfolio__c = portfolio.Id;
                snapshots.add(item);
            }
        }
        upsert snapshots R360_KPI_Snapshot__c.Snapshot_Key__c;

        List<R360_Resource_Unavailability__c> unavailability = new List<R360_Resource_Unavailability__c>();
        for (Integer index = 0; index < Math.min(12, resources.size()); index++) {
            Resource__c resource = resources[index];
            unavailability.add(new R360_Resource_Unavailability__c(
                Unavailability_Key__c='DEMO-UNA-'+String.valueOf(index+1).leftPad(3,'0'), Resource__c=resource.Id,
                Type__c=Math.mod(index,3)==0?'Training':'Leave', Start_Date__c=today.addDays(7+index*3),
                End_Date__c=today.addDays(7+index*3+Math.mod(index,3)), Hours_Per_Day__c=8,
                Status__c='Approved', Reason__c='Sanitized demo capacity event used in the thirteen-week forecast.',
                Approved_By__c=UserInfo.getUserId(), Approved_At__c=cutoff, Source_System__c='EXL People Master Mock', Source_Last_Sync__c=cutoff
            ));
        }
        if (!unavailability.isEmpty()) upsert unavailability R360_Resource_Unavailability__c.Unavailability_Key__c;

        enrichResources(resources, today);
        enrichEngagements(engagements, today);
        enrichDelivery(today);
        enrichCommercial();
        enrichAssurance(today);
    }

    private static void enrichResources(List<Resource__c> resources, Date today) {
        List<String> locations = new List<String>{'Bengaluru','Hyderabad','Pune','Noida','Chennai'};
        List<String> capabilities = new List<String>{'Data Cloud','Agentforce','MuleSoft','Service Cloud','Sales Cloud'};
        for (Integer index = 0; index < resources.size(); index++) {
            Resource__c resource = resources[index];
            resource.Expected_Roll_Off_Date__c = today.addDays(35 + Math.mod(index * 11, 140));
            resource.Bench_Start_Date__c = null;
            resource.Preferred_Location__c = locations[Math.mod(index, locations.size())];
            resource.Preferred_Shift__c = Math.mod(index, 4) == 0 ? 'US overlap' : 'India standard';
            resource.Travel_Preference__c = new List<String>{'No travel','Up to 25%','Up to 50%','Flexible'}[Math.mod(index,4)];
            resource.Preferred_Project_Type__c = new List<String>{'Transformation','Managed services','Advisory','Implementation'}[Math.mod(index,4)];
            resource.Preferred_Capability__c = capabilities[Math.mod(index, capabilities.size())];
            Boolean over = resource.Allocated_Daily_Hours__c != null && resource.Allocated_Daily_Hours__c > 8;
            resource.Consecutive_Overallocation_Days__c = over ? 3 + Math.mod(index,8) : 0;
            resource.Rolling_Overage_Hours_13W__c = over ? 18 + Math.mod(index * 7,30) : 0;
        }
        if (!resources.isEmpty()) update resources;
    }

    private static void enrichEngagements(List<Engagement__c> engagements, Date today) {
        for (Integer index = 0; index < engagements.size(); index++) {
            Engagement__c engagement = engagements[index];
            Integer variance = Math.mod(index * 5, 19) - 5;
            engagement.Forecast_Completion_Date__c = engagement.End_Date__c == null ? today.addDays(120) : engagement.End_Date__c.addDays(variance);
            engagement.Schedule_Variance_Days__c = variance;
            engagement.Acceptance_First_Pass_Percent__c = 82 + Math.mod(index * 4,18);
            engagement.CSAT_Score__c = 3.8 + Decimal.valueOf(Math.mod(index,11)) / 10;
            engagement.NPS_Score__c = 32 + Math.mod(index * 7,43);
            engagement.Account_Health_Score__c = 74 + Math.mod(index * 6,25);
            engagement.Release_Count__c = 1 + Math.mod(index,8);
            engagement.Incident_Count__c = Math.mod(index,4);
            engagement.Mandatory_Skill_Coverage_Percent__c = 86 + Math.mod(index * 5,15);
            engagement.Role_Readiness_Percent__c = 82 + Math.mod(index * 7,19);
            engagement.Risk_Exposure_Score__c = 8 + Math.mod(index * 9,38);
            engagement.High_Risk_Age_Days__c = 4 + Math.mod(index * 3,31);
            engagement.Plan_Actual_Variance_Percent__c = -6 + Math.mod(index * 2,15);
        }
        if (!engagements.isEmpty()) update engagements;
    }

    private static void enrichDelivery(Date today) {
        List<Allocation__c> allocations = [SELECT Id, Resource__c, Resource__r.Allocated_Daily_Hours__c, End_Date__c, Daily_Hours__c, Overallocated__c, Overallocation_Status__c FROM Allocation__c WHERE Current__c=true ORDER BY Resource__c, Start_Date__c];
        Map<Id,Integer> concurrency = new Map<Id,Integer>();
        for (Allocation__c allocation : allocations) concurrency.put(allocation.Resource__c, (concurrency.containsKey(allocation.Resource__c) ? concurrency.get(allocation.Resource__c) : 0) + 1);
        List<Allocation__c> allocationUpdates = new List<Allocation__c>();
        for (Integer index = 0; index < allocations.size(); index++) {
            Allocation__c allocation = allocations[index];
            if (allocation.Resource__r.Allocated_Daily_Hours__c > 8 && !(allocation.Overallocated__c && allocation.Overallocation_Status__c == 'Approved')) continue;
            allocation.Cost_Rate_Snapshot__c = 1800 + Math.mod(index * 173, 2200);
            allocation.Billing_Rate_Snapshot__c = 3200 + Math.mod(index * 229, 3600);
            allocation.Concurrent_Project_Count__c = concurrency.get(allocation.Resource__c);
            allocation.Context_Switch_Count__c = Math.max(0, concurrency.get(allocation.Resource__c) - 1) * 5;
            allocation.Expected_Roll_Off_Date__c = allocation.End_Date__c;
            allocationUpdates.add(allocation);
        }
        if (!allocationUpdates.isEmpty()) update allocationUpdates;

        List<Staffing_Request__c> requests = [SELECT Id, CreatedDate, State__c FROM Staffing_Request__c ORDER BY CreatedDate];
        for (Integer index = 0; index < requests.size(); index++) {
            Staffing_Request__c request = requests[index];
            request.Submitted_At__c = request.CreatedDate;
            request.Shortlist_Count__c = 2 + Math.mod(index,6);
            request.Shortlist_Conversion_Percent__c = request.State__c == 'Accepted' ? 100 / request.Shortlist_Count__c : 0;
            if (request.State__c == 'Accepted') {
                Decimal fillHours = 8 + Math.mod(index * 11,72);
                request.Time_To_Fill_Hours__c = fillHours;
                request.Filled_At__c = request.CreatedDate.addHours(Integer.valueOf(String.valueOf(fillHours.setScale(0))));
            }
        }
        if (!requests.isEmpty()) update requests;

        List<Work_Unit__c> workUnits = [SELECT Id, Start_Date__c, End_Date__c, Baseline_Start_Date__c, Baseline_End_Date__c, Percent_Complete__c, Planned_Hours__c, Status__c FROM Work_Unit__c ORDER BY Engagement__c, Sequence__c];
        for (Integer index = 0; index < workUnits.size(); index++) {
            Work_Unit__c unit = workUnits[index];
            Integer delay = Math.mod(index * 3,14) - 3;
            Decimal planned = unit.Planned_Hours__c == null ? 160 : unit.Planned_Hours__c;
            Decimal completion = unit.Percent_Complete__c == null ? 0 : unit.Percent_Complete__c;
            unit.Forecast_Start_Date__c = (unit.Start_Date__c == null ? today : unit.Start_Date__c).addDays(Math.max(0,delay/2));
            unit.Forecast_End_Date__c = (unit.End_Date__c == null ? today.addDays(30) : unit.End_Date__c).addDays(delay);
            unit.Forecast_Completion_Date__c = unit.Forecast_End_Date__c;
            unit.Actual_Start_Date__c = completion > 0 ? unit.Start_Date__c : null;
            unit.Actual_End_Date__c = completion >= 100 ? unit.Forecast_End_Date__c : null;
            unit.Milestone_Delay_Days__c = delay;
            unit.Planned_Value__c = planned * 2200;
            unit.Earned_Value__c = unit.Planned_Value__c * completion / 100;
            unit.Actual_Cost__c = unit.Earned_Value__c == 0 ? 0 : unit.Earned_Value__c * (0.88 + Decimal.valueOf(Math.mod(index,19))/100);
            unit.Estimate_To_Complete__c = Math.max(0,unit.Planned_Value__c-unit.Earned_Value__c) * (0.92 + Decimal.valueOf(Math.mod(index,13))/100);
            unit.Estimate_At_Completion__c = unit.Actual_Cost__c + unit.Estimate_To_Complete__c;
            unit.Schedule_Performance_Index__c = unit.Planned_Value__c == 0 ? 1 : Math.max(0.7,Math.min(1.2,(completion/100) + 0.86));
            unit.Cost_Performance_Index__c = unit.Actual_Cost__c == 0 ? 1 : unit.Earned_Value__c / unit.Actual_Cost__c;
            unit.Defect_Count__c = Math.mod(index * 5,12);
            unit.Test_Pass_Percent__c = 84 + Math.mod(index * 7,17);
        }
        if (!workUnits.isEmpty()) update workUnits;
    }

    private static void enrichCommercial() {
        List<Budget__c> budgets = [SELECT Id, Revenue__c, Total_Cost__c, Margin_Percent__c FROM Budget__c WHERE Current__c=true ORDER BY Engagement__c];
        for (Integer index = 0; index < budgets.size(); index++) {
            Budget__c budget = budgets[index];
            Decimal revenue = budget.Revenue__c == null ? 0 : budget.Revenue__c;
            Decimal cost = budget.Total_Cost__c == null ? 0 : budget.Total_Cost__c;
            Decimal factor = 0.97 + Decimal.valueOf(Math.mod(index,7))/100;
            budget.Forecast_Revenue__c = revenue * (0.96 + Decimal.valueOf(Math.mod(index,9))/100);
            budget.Forecast_Cost__c = cost * factor;
            budget.Forecast_Margin_Percent__c = budget.Forecast_Revenue__c == 0 ? 0 : (budget.Forecast_Revenue__c-budget.Forecast_Cost__c)/budget.Forecast_Revenue__c*100;
            budget.Margin_Erosion_Points__c = (budget.Margin_Percent__c == null ? 0 : budget.Margin_Percent__c) - budget.Forecast_Margin_Percent__c;
            budget.Estimate_To_Complete__c = budget.Forecast_Cost__c * (0.28 + Decimal.valueOf(Math.mod(index,20))/100);
            budget.Estimate_At_Completion__c = budget.Forecast_Cost__c;
            budget.Forecast_Accuracy_Percent__c = 86 + Math.mod(index * 7,14);
        }
        if (!budgets.isEmpty()) update budgets;

        List<Contract_Payment__c> payments = [SELECT Id, Planned_Amount__c, Invoiced_Amount__c, Paid_Amount__c, Days_Overdue__c FROM Contract_Payment__c ORDER BY Engagement__c, Sequence__c];
        for (Integer index = 0; index < payments.size(); index++) {
            Contract_Payment__c payment = payments[index];
            Decimal planned = payment.Planned_Amount__c == null ? 0 : payment.Planned_Amount__c;
            Decimal invoiced = payment.Invoiced_Amount__c == null ? 0 : payment.Invoiced_Amount__c;
            Decimal paid = payment.Paid_Amount__c == null ? 0 : payment.Paid_Amount__c;
            payment.Revenue_Recognized_Amount__c = Math.min(planned, Math.max(invoiced, planned * Decimal.valueOf(Math.mod(index,5)+3)/10));
            payment.Write_Off_Amount__c = Math.mod(index,19)==0 ? planned*0.015 : 0;
            payment.Billing_Realization_Percent__c = planned == 0 ? 0 : payment.Revenue_Recognized_Amount__c/planned*100;
            payment.DSO_Days__c = payment.Days_Overdue__c == null ? 28 + Math.mod(index*7,46) : 30 + payment.Days_Overdue__c;
            payment.Collection_Effectiveness_Percent__c = invoiced == 0 ? 0 : paid/invoiced*100;
        }
        if (!payments.isEmpty()) update payments;
    }

    private static void enrichAssurance(Date today) {
        List<Credential__c> credentials = [SELECT Id, Expiry_Date__c FROM Credential__c ORDER BY Resource__c];
        for (Credential__c credential : credentials) {
            if (credential.Expiry_Date__c == null) credential.Expiry_Risk_Band__c = 'No expiry';
            else {
                Integer days = today.daysBetween(credential.Expiry_Date__c);
                credential.Expiry_Risk_Band__c = days < 0 ? 'Expired' : days <= 30 ? '0-30 days' : days <= 60 ? '31-60 days' : days <= 90 ? '61-90 days' : 'Beyond 90 days';
            }
        }
        if (!credentials.isEmpty()) update credentials;
        List<Skill_Claim__c> claims = [SELECT Id, Last_Used__c FROM Skill_Claim__c ORDER BY Resource__c];
        for (Integer index = 0; index < claims.size(); index++) {
            Skill_Claim__c claim = claims[index];
            Integer days = claim.Last_Used__c == null ? 365 : claim.Last_Used__c.daysBetween(today);
            claim.Freshness_Days__c = days;
            claim.Decay_Status__c = days <= 90 ? 'Current' : days <= 180 ? 'Review Due' : days <= 365 ? 'Stale' : 'Revalidation Required';
        }
        if (!claims.isEmpty()) update claims;
        List<Project_Risk__c> risks = [SELECT Id, Status__c, Due_Date__c FROM Project_Risk__c ORDER BY Engagement__c];
        for (Integer index = 0; index < risks.size(); index++) {
            Project_Risk__c risk = risks[index];
            risk.Probability_Percent__c = 20 + Math.mod(index*13,70);
            risk.Impact_Score__c = 1 + Math.mod(index,5);
            risk.Exposure_Score__c = risk.Probability_Percent__c * risk.Impact_Score__c / 100;
            risk.Age_Days__c = risk.Status__c == 'Closed' ? 0 : 3 + Math.mod(index*5,50);
            risk.Mitigation_Overdue__c = risk.Status__c != 'Closed' && risk.Due_Date__c != null && risk.Due_Date__c < today;
        }
        if (!risks.isEmpty()) update risks;
        List<R360_Integration_Run__c> runs = [SELECT Id, Processed_Count__c, Failure_Count__c, Completeness_Percent__c FROM R360_Integration_Run__c ORDER BY CreatedDate DESC LIMIT 100];
        for (Integer index = 0; index < runs.size(); index++) {
            R360_Integration_Run__c run = runs[index];
            run.Processing_Latency_Seconds__c = 1.5 + Math.mod(index*17,240);
            run.Identity_Match_Percent__c = 96 + Decimal.valueOf(Math.mod(index,40))/10;
            run.Orphan_Record_Count__c = Math.mod(index,5);
            run.Field_Completeness_Percent__c = run.Completeness_Percent__c == null ? 98 : run.Completeness_Percent__c;
            run.Data_Quality_Score__c = Math.max(0,run.Field_Completeness_Percent__c - run.Orphan_Record_Count__c*0.4);
            run.Retry_Count__c = (run.Failure_Count__c == null || run.Failure_Count__c == 0) ? 0 : 1 + Math.mod(index,3);
        }
        if (!runs.isEmpty()) update runs;
        List<R360_Role_Scope__c> scopes = [SELECT Id, Valid_To__c FROM R360_Role_Scope__c];
        for (R360_Role_Scope__c scope : scopes) {
            scope.Recertification_Due_Date__c = today.addDays(75);
            scope.SoD_Conflict__c = false;
            scope.SoD_Conflict_Detail__c = null;
        }
        if (!scopes.isEmpty()) update scopes;
    }

    private static R360_KPI_Snapshot__c metric(String code, String label, Date period, String grain, String scopeType, String scopeKey, String scopeLabel, Decimal numerator, Decimal denominator, Decimal value, Decimal target, String unit, String status, Boolean forecast, DateTime cutoff, String definition, String ownerRole) {
        return new R360_KPI_Snapshot__c(
            Snapshot_Key__c=code+'|'+scopeKey+'|'+String.valueOf(period)+'|'+grain,
            Metric_Code__c=code, Metric_Label__c=label, Snapshot_Date__c=period, Grain__c=grain,
            Scope_Type__c=scopeType, Scope_Key__c=scopeKey, Scope_Label__c=scopeLabel,
            Numerator__c=numerator, Denominator__c=denominator, Metric_Value__c=value, Target_Value__c=target,
            Unit__c=unit, Status__c=status, Forecast__c=forecast, Source_Cutoff__c=cutoff,
            Definition__c=definition, Owner_Role__c=ownerRole, Policy_Version__c='R360-KPI-1.0'
        );
    }
    private static Decimal percent(Decimal numerator, Decimal denominator) { return denominator == null || denominator == 0 ? 0 : (numerator/denominator*100).setScale(1); }
    private static String ownerFor(String code) {
        if (code == 'BILLED_UTILIZATION' || code == 'BENCH_AGE_DAYS') return 'Head of Delivery';
        if (code == 'FULFILMENT_RATE' || code == 'TIME_TO_STAFF_DAYS') return 'COE Staffer';
        if (code == 'DATA_QUALITY_SCORE') return 'Operations';
        if (code == 'MARGIN_EROSION_PTS' || code == 'CPI') return 'Finance/PMO';
        return 'Project Manager';
    }
}
