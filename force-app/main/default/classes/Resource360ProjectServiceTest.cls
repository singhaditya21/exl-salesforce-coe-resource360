@IsTest
private class Resource360ProjectServiceTest {
    @TestSetup
    static void setup(){Resource360DemoData.seed();}

    @IsTest
    static void governedIntakeCreatesProjectSowAndLine(){
        R360_Portfolio__c portfolio=[SELECT Id FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' LIMIT 1];
        Date startDate=Date.today().addDays(30),endDate=startDate.addMonths(8);
        Test.startTest();Resource360Service.ServiceResult created=Resource360ProjectService.createProject('TEST-ENG-INTAKE','Governed Intake Project',portfolio.Id,'Banking','Service Cloud',startDate,endDate,'Fixed Price','INR','TEST-SOW-INTAKE',12000000,'TEST-INTAKE-CORRELATION');Test.stopTest();
        System.assert(created.success);Engagement__c project=[SELECT Status__c,Lifecycle_Stage__c,Completion_Percent__c,Intake_Source__c FROM Engagement__c WHERE Id=:created.recordId];
        System.assertEquals('Planned',project.Status__c);System.assertEquals('Contracted',project.Lifecycle_Stage__c);System.assertEquals(0,project.Completion_Percent__c);
        Commercial_Reference__c sow=[SELECT Approval_Status__c,Change_Type__c,Version__c FROM Commercial_Reference__c WHERE Engagement__c=:project.Id LIMIT 1];
        System.assertEquals('Approved',sow.Approval_Status__c);System.assertEquals('Initial',sow.Change_Type__c);System.assertEquals(1,sow.Version__c);
        System.assertEquals(1,[SELECT COUNT() FROM Commercial_Line__c WHERE Commercial_Reference__c=:sow.Id]);
        System.assert(Resource360ProjectService.getPortfolioOptions().size()>0,'Governed project intake needs an authorized portfolio option.');
    }

    @IsTest
    static void ganttSupportsDependenciesCascadeProgressAcceptanceAndRisk(){
        Engagement__c engagement=[SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001' LIMIT 1];
        Allocation__c allocation=[SELECT Resource__c,Start_Date__c,End_Date__c,Daily_Hours__c FROM Allocation__c WHERE Engagement__c=:engagement.Id AND Current__c=true AND State__c='Accepted' LIMIT 1];
        Date taskStart=Date.today().addDays(2),taskEnd=Date.today().addDays(8);if(taskStart<allocation.Start_Date__c)taskStart=allocation.Start_Date__c;if(taskEnd>allocation.End_Date__c)taskEnd=allocation.End_Date__c;
        Resource360Service.ServiceResult first=Resource360ProjectService.saveWorkUnit(engagement.Id,null,'TEST-WBS-01','Configured Build','Build',10,taskStart,taskEnd,56,Math.min(allocation.Daily_Hours__c,4),allocation.Resource__c,false,true,true);
        Date milestoneDate=taskEnd.addDays(1);Resource360Service.ServiceResult milestone=Resource360ProjectService.saveWorkUnit(engagement.Id,null,'TEST-WBS-02','Build Acceptance','Test',20,milestoneDate,milestoneDate,0,0,null,true,true,true);
        Resource360Service.ServiceResult dependency=Resource360ProjectService.saveDependency(engagement.Id,first.recordId,milestone.recordId,'Finish-to-Start',0,'TEST-DEP-01');System.assert(dependency.success);
        Date originalMilestone=[SELECT Start_Date__c FROM Work_Unit__c WHERE Id=:milestone.recordId].Start_Date__c;
        Resource360ProjectService.rescheduleWorkUnit(first.recordId,taskStart,taskEnd.addDays(1),true,'Resize the build bar and cascade the acceptance milestone.');
        System.assertEquals(originalMilestone.addDays(1),[SELECT Start_Date__c FROM Work_Unit__c WHERE Id=:milestone.recordId].Start_Date__c,'A duration resize must auto-schedule successors when cascade is selected.');
        String plan=Resource360ProjectService.getProjectPlan(engagement.Id);System.assert(plan.contains('TEST-WBS-01'));System.assert(plan.contains('Finish-to-Start'));System.assert(plan.contains('zoomOptions'));System.assert(plan.contains('canApproveCloseout'));
        Resource360ProjectService.acceptDeliverable(first.recordId,'Customer accepted the configured build.');Resource360ProjectService.updateProgress(first.recordId,100,'Complete','Build completion verified.');
        Resource360ProjectService.acceptDeliverable(milestone.recordId,'Acceptance milestone signed.');Resource360ProjectService.updateProgress(milestone.recordId,100,'Complete','Acceptance milestone complete.');
        Resource360Service.ServiceResult risk=Resource360ProjectService.saveRisk(engagement.Id,null,'TEST-RISK-01','Deployment readiness','Release evidence is incomplete.','High',UserInfo.getUserId(),Date.today().addDays(10),'Complete the release checklist.');
        Resource360ProjectService.closeRisk(risk.recordId,'Release evidence attached and independently reviewed.');
        System.assertEquals('Closed',[SELECT Status__c FROM Project_Risk__c WHERE Id=:risk.recordId].Status__c);
        System.assertEquals(1,[SELECT COUNT() FROM Work_Dependency__c WHERE Id=:dependency.recordId]);
        System.assert([SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c=:engagement.Id AND Critical_Path__c=true]>0,'The project plan must identify a critical path.');
    }

    @IsTest
    static void closeoutFailsClosedThenCompletesWithIndependentApproval(){
        Engagement__c engagement=[SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001' LIMIT 1];
        Resource360ProjectService.GateSnapshot blocked=Resource360ProjectService.closeoutReadiness(engagement.Id);System.assertEquals(false,blocked.ready);System.assert(blocked.incompleteWorkUnits>0||blocked.unreconciledTimeEntries>0);
        List<Work_Unit__c>units=[SELECT Id,Acceptance_Required__c FROM Work_Unit__c WHERE Engagement__c=:engagement.Id];for(Work_Unit__c unit:units){unit.Acceptance_Status__c=unit.Acceptance_Required__c?'Accepted':'Not Required';unit.Accepted_By__c=unit.Acceptance_Required__c?UserInfo.getUserId():null;unit.Accepted_At__c=unit.Acceptance_Required__c?System.now():null;unit.Percent_Complete__c=100;unit.Status__c='Complete';}update units;
        List<Time_Entry__c>entries=[SELECT Id,State__c FROM Time_Entry__c WHERE Engagement__c=:engagement.Id];for(Time_Entry__c entry:entries)entry.State__c='Approved';update entries;
        Resource360ProjectService.GateSnapshot ready=Resource360ProjectService.closeoutReadiness(engagement.Id);System.assertEquals(true,ready.ready,String.join(ready.blockers,' '));
        Resource360Service.ServiceResult draft=Resource360ProjectService.createCloseoutDraft(engagement.Id,Date.today(),'Preserve early architecture validation and weekly skill-fit reviews.','All scoped deliverables accepted in the sanitized demo.');
        Resource360Service.ServiceResult submitted=Resource360ProjectService.submitCloseout(draft.recordId);System.assert(submitted.success);System.assertEquals('Pending Approval',[SELECT State__c FROM Project_Closeout__c WHERE Id=:draft.recordId].State__c);
        Profile adminProfile=[SELECT Id FROM Profile WHERE PermissionsModifyAllData=true LIMIT 1];String suffix=String.valueOf(DateTime.now().getTime());User approver=new User(Alias='pcoappr',Email='pco-'+suffix+'@example.invalid',EmailEncodingKey='UTF-8',LastName='Closeout Approver',LanguageLocaleKey='en_US',LocaleSidKey='en_US',ProfileId=adminProfile.Id,TimeZoneSidKey='Asia/Kolkata',Username='pco-'+suffix+'@example.invalid');insert approver;
        PermissionSet closeoutPermissions=[SELECT Id FROM PermissionSet WHERE Name='Resource360_Closeout_Approver_Actions' LIMIT 1];
        insert new PermissionSetAssignment(AssigneeId=approver.Id,PermissionSetId=closeoutPermissions.Id);
        System.runAs(approver){Resource360Service.ServiceResult decided=Resource360ProjectService.decideCloseout(draft.recordId,true,'All project completion gates independently verified.');System.assert(decided.success);}
        engagement=[SELECT Status__c,Lifecycle_Stage__c,Completion_Percent__c,Actual_End_Date__c FROM Engagement__c WHERE Id=:engagement.Id];System.assertEquals('Completed',engagement.Status__c);System.assertEquals('Complete',engagement.Lifecycle_Stage__c);System.assertEquals(100,engagement.Completion_Percent__c);System.assertEquals(Date.today(),engagement.Actual_End_Date__c);
        System.assertEquals(0,[SELECT COUNT() FROM Allocation__c WHERE Engagement__c=:engagement.Id AND Current__c=true AND State__c='Accepted']);
        System.assertEquals(1,[SELECT COUNT() FROM R360_Approval_Decision__c WHERE Entity_Type__c='Project_Closeout__c' AND Entity_ID__c=:String.valueOf(draft.recordId) AND State__c='Approved']);
    }

    @IsTest
    static void dependencyCycleAndAllocationCoverageFailClosed(){
        Engagement__c engagement=[SELECT Id,Start_Date__c FROM Engagement__c WHERE Engagement_ID__c='ENG-1001' LIMIT 1];Date firstDate=Date.today().addDays(20),secondDate=firstDate.addDays(2);
        Resource360Service.ServiceResult first=Resource360ProjectService.saveWorkUnit(engagement.Id,null,'TEST-CYCLE-01','Cycle A','Design',1,firstDate,firstDate,0,0,null,true,false,false);
        Resource360Service.ServiceResult second=Resource360ProjectService.saveWorkUnit(engagement.Id,null,'TEST-CYCLE-02','Cycle B','Design',2,secondDate,secondDate,0,0,null,true,false,false);
        Resource360ProjectService.saveDependency(engagement.Id,first.recordId,second.recordId,'Finish-to-Start',0,'TEST-CYCLE-DEP-01');
        Boolean cycleBlocked=false;try{Resource360ProjectService.saveDependency(engagement.Id,second.recordId,first.recordId,'Finish-to-Start',0,'TEST-CYCLE-DEP-02');}catch(AuraHandledException expected){cycleBlocked=true;}System.assert(cycleBlocked,'Dependency cycles must be rejected.');
        Resource__c uncovered=[SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-019830' LIMIT 1];Boolean coverageBlocked=false;try{Resource360ProjectService.saveWorkUnit(engagement.Id,null,'TEST-NO-CAP','Uncovered Task','Build',3,firstDate,secondDate,16,4,uncovered.Id,false,false,false);}catch(AuraHandledException expected){coverageBlocked=true;}System.assert(coverageBlocked,'A task assignment without allocation coverage must be rejected.');
    }
}
