@IsTest
private class Resource360ScaleDemoDataTest {
    @TestSetup
    static void setupData(){Resource360DemoData.seed();}

    @IsTest
    static void seedsExactStorageConsciousRelationshipGraphIdempotently(){
        Resource360Service.ServiceResult first=Resource360ScaleDemoData.ensure();
        Test.startTest();
        Resource360Service.ServiceResult second=Resource360ScaleDemoData.ensure();
        Test.stopTest();
        System.assert(first.success);System.assert(second.success);
        Resource360ScaleDemoData.SeedManifest manifest=Resource360ScaleDemoData.manifest();
        System.assertEquals(10,manifest.accounts);
        System.assertEquals(10,manifest.portfolios);
        System.assertEquals(20,manifest.subPortfolios);
        System.assertEquals(20,manifest.projects);
        System.assert(manifest.contracts>=40,'Every project needs multiple contracts.');
        System.assert(manifest.payments>=120,'Every scaled contract needs three payment milestones.');
        System.assertEquals(60,manifest.resources);
        System.assertEquals(60,manifest.memberships);
        System.assertEquals(60,manifest.modules);
        System.assert(manifest.workUnits>=115,'Every project needs a multi-unit work plan.');
        System.assert(manifest.dependencies>=95,'Every scaled work plan needs a dependency chain.');
        System.assert(manifest.staffingRequests>=76,'Every non-anchor project needs multiple accepted resources.');
        System.assert(manifest.allocations>=76,'Accepted demand must resolve to governed allocations.');
        System.assert(manifest.budgets>=20,'Every project needs a current budget.');
        System.assert(manifest.skillRequirements>=57,'Every non-anchor project needs three-dimensional skill demand.');
        System.assert(manifest.risks>=38,'Every non-anchor project needs rich risk coverage.');
        System.assert(manifest.actuals>=38,'Every non-anchor project needs approved actuals.');
    }

    @IsTest
    static void hierarchyAndCommercialRelationshipsAreInternallyConsistent(){
        Resource360ScaleDemoData.ensure();
        System.assertEquals(0,[SELECT COUNT() FROM Engagement__c WHERE Engagement_ID__c IN ('ENG-1001','ENG-1002','DEMO-ENG-1003','DEMO-ENG-1004','SCALE-ENG-1005','SCALE-ENG-1006','SCALE-ENG-1007','SCALE-ENG-1008','SCALE-ENG-1009','SCALE-ENG-1010','SCALE-ENG-1011','SCALE-ENG-1012','SCALE-ENG-1013','SCALE-ENG-1014','SCALE-ENG-1015','SCALE-ENG-1016','SCALE-ENG-1017','SCALE-ENG-1018','SCALE-ENG-1019','SCALE-ENG-1020') AND (Account__c=null OR Portfolio__c=null OR Sub_Portfolio__c=null)]);
        for(AggregateResult value:[SELECT Engagement__c projectId,COUNT(Id) total FROM Commercial_Reference__c WHERE Engagement__r.Intake_Correlation_ID__c LIKE 'R360-SCALE-10X20-V1-%' GROUP BY Engagement__c])System.assert(Integer.valueOf(value.get('total'))>=2,'Every project must have multiple contracts.');
        for(AggregateResult value:[SELECT Commercial_Reference__c contractId,COUNT(Id) total FROM Contract_Payment__c WHERE Payment_ID__c LIKE 'SCALE-PAY-%' GROUP BY Commercial_Reference__c])System.assertEquals(3,Integer.valueOf(value.get('total')),'Every contract must have three payment milestones.');
        for(Project_Module__c module:[SELECT Sub_Portfolio__c,Engagement__r.Sub_Portfolio__c FROM Project_Module__c WHERE Module_ID__c LIKE 'SCALE-MOD-%'])System.assertEquals(module.Engagement__r.Sub_Portfolio__c,module.Sub_Portfolio__c);
        for(Work_Unit__c unit:[SELECT Engagement__c,Project_Module__r.Engagement__c FROM Work_Unit__c WHERE Project_Module__c!=null])System.assertEquals(unit.Engagement__c,unit.Project_Module__r.Engagement__c);
        System.assertEquals(4,[SELECT COUNT() FROM Project_Closeout__c WHERE Closeout_ID__c LIKE 'SCALE-CLOSE-%' AND State__c='Approved']);
    }
}
