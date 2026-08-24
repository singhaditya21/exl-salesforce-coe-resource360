@IsTest
private class Resource360IntegrationContractTest {
    @TestSetup
    static void setupData() { Resource360DemoData.seed(); }

    @IsTest
    static void twoHundredRowAtomicBatchCommitsAndReplaysIdempotently() {
        List<Object> rows = new List<Object>();
        for (Integer index = 0; index < 200; index++) {
            rows.add(new Map<String,Object>{
                'employeeId'=>'LOAD-'+String.valueOf(1000 + index).substring(1),
                'preferredName'=>'Scale Practitioner '+index,
                'employmentStart'=>'2026-01-01',
                'tower'=>'Delivery',
                'status'=>'Active',
                'dailyCapacityHours'=>8
            });
        }
        String payload = JSON.serialize(rows);
        Resource360BulkService.BulkPreview preview = Resource360BulkService.preview('Employee', payload);
        System.assertEquals(200, preview.totalRows);
        System.assertEquals(200, preview.validRows);

        Test.startTest();
        Resource360Service.ServiceResult first = Resource360BulkService.executeBatch('Employee', payload, 'scale-200.json', 'Atomic');
        Resource360Service.ServiceResult replay = Resource360BulkService.executeBatch('Employee', payload, 'scale-200.json', 'Atomic');
        Test.stopTest();
        System.assert(first.success, first.message);
        System.assertEquals(first.recordId, replay.recordId);
        System.assertEquals(200, [SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'LOAD-%']);
        R360_Integration_Run__c run = [SELECT Processed_Count__c,Success_Count__c,Inserted_Count__c,Failure_Count__c,Contract_Version__c,Commit_Mode__c FROM R360_Integration_Run__c WHERE Id=:first.recordId];
        System.assertEquals(200, run.Processed_Count__c);
        System.assertEquals(200, run.Success_Count__c);
        System.assertEquals(0, run.Failure_Count__c);
        System.assertEquals('R360-MOCK-1.2', run.Contract_Version__c);
        System.assertEquals('Atomic', run.Commit_Mode__c);
    }

    @IsTest
    static void batchBoundaryDuplicatesFormulaContentAndContractVersionsFailClosed() {
        List<Object> tooMany = new List<Object>();
        for (Integer index = 0; index < 201; index++) tooMany.add(new Map<String,Object>{'capabilityId'=>'CAP-'+index,'name'=>'Capability '+index,'type'=>'Salesforce'});
        Boolean boundaryBlocked = false;
        try { Resource360BulkService.preview('Capability', JSON.serialize(tooMany)); }
        catch (AuraHandledException expected) { boundaryBlocked = true; }
        System.assert(boundaryBlocked, 'The configured interactive batch boundary must be enforced before processing.');

        Resource360BulkService.BulkPreview unsafe = Resource360BulkService.preview('Capability', '[{"capabilityId":"DUP-1","name":"Safe","type":"Salesforce"},{"capabilityId":"DUP-1","name":"=HYPERLINK(1)","type":"Salesforce"}]');
        System.assertEquals(false, unsafe.valid);
        System.assert(unsafe.rows[1].message.contains('Duplicate external identity'));
        System.assert(unsafe.rows[1].message.contains('Formula-like'));

        System.assert(contractRejected(null), 'Missing contractVersion must fail before a run is created.');
        System.assert(contractRejected('R360-MOCK-0.1'), 'Unknown contractVersion must fail before a run is created.');
        System.assertEquals(0, [SELECT COUNT() FROM R360_Integration_Run__c WHERE Run_ID__c LIKE 'CONTRACT-NEGATIVE-%']);
    }

    private static Boolean contractRejected(String version) {
        RestRequest request = new RestRequest();
        request.requestUri = '/services/apexrest/resource360/v1/master-data/capabilities';
        request.httpMethod = 'POST';
        Map<String,Object> envelope = new Map<String,Object>{'runId'=>'CONTRACT-NEGATIVE-'+String.valueOf(version),'sourceSystem'=>'Mock capability source','entityType'=>'Capability','records'=>new List<Object>()};
        if (version != null) envelope.put('contractVersion', version);
        request.requestBody = Blob.valueOf(JSON.serialize(envelope));
        RestContext.request = request; RestContext.response = new RestResponse();
        try { Resource360InboundApi.ingest(); return false; }
        catch (Exception expected) { return true; }
    }
}
