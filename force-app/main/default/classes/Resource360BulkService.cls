public inherited sharing class Resource360BulkService {
    public class RowResult {
        @AuraEnabled public Integer rowNumber;
        @AuraEnabled public String externalId;
        @AuraEnabled public Boolean valid;
        @AuraEnabled public String message;
    }
    public class BulkPreview {
        @AuraEnabled public Boolean valid;
        @AuraEnabled public String entityType;
        @AuraEnabled public Integer totalRows;
        @AuraEnabled public Integer validRows;
        @AuraEnabled public Integer invalidRows;
        @AuraEnabled public String fileHash;
        @AuraEnabled public String message;
        @AuraEnabled public String errorCsv;
        @AuraEnabled public List<RowResult> rows;
    }

    private static final Map<String,List<String>> REQUIRED_FIELDS=new Map<String,List<String>>{
        'employee'=>new List<String>{'employeeId','preferredName','employmentStart','tower'},
        'engagement'=>new List<String>{'engagementId','name'},
        'capability'=>new List<String>{'capabilityId','name'},
        'credential'=>new List<String>{'credentialId','employeeId','name'},
        'learningachievement'=>new List<String>{'achievementId','employeeId','courseName','provider'},
        'commercialreference'=>new List<String>{'externalId','engagementId','signature'},
        'orgunit'=>new List<String>{'orgUnitId','name','unitType'},
        'portfolio'=>new List<String>{'portfolioId','name'}
    };
    private static final Map<String,String> EXTERNAL_FIELDS=new Map<String,String>{
        'employee'=>'employeeId','engagement'=>'engagementId','capability'=>'capabilityId','credential'=>'credentialId',
        'learningachievement'=>'achievementId','commercialreference'=>'externalId','orgunit'=>'orgUnitId','portfolio'=>'portfolioId'
    };
    private static final Set<String> DATE_FIELDS=new Set<String>{'employmentStart','employmentEnd','startDate','endDate','effectiveFrom','effectiveTo','issueDate','expiryDate','maintenanceDate','completedOn','validFrom','validTo'};

    @AuraEnabled(cacheable=true)
    public static BulkPreview preview(String entityType,String jsonRows){
        Resource360Security.requirePermission('Resource360_Manage_Bulk_Operations','Bulk-operation permission is required.');
        String normalized=normalize(entityType);List<Object> rows=parse(jsonRows);Integer maximumRows=Integer.valueOf(Resource360Policy.numberValue('Bulk_Max_Rows',200));if(rows.size()>maximumRows)fail('Interactive bulk validation is limited to the configured '+maximumRows+' rows per batch.');
        BulkPreview result=new BulkPreview();result.entityType=canonical(normalized);result.totalRows=rows.size();result.validRows=0;result.invalidRows=0;result.rows=new List<RowResult>();result.fileHash=hash(jsonRows);Set<String>seen=new Set<String>();
        for(Integer index=0;index<rows.size();index++){
            RowResult rowResult=new RowResult();rowResult.rowNumber=index+1;List<String>errors=new List<String>();Map<String,Object> row;
            try{row=(Map<String,Object>)rows[index];}catch(Exception failure){errors.add('Row must be a JSON object.');}
            if(row!=null){
                for(String field:REQUIRED_FIELDS.get(normalized))if(row.get(field)==null||String.isBlank(String.valueOf(row.get(field))))errors.add(field+' is required.');
                String externalField=EXTERNAL_FIELDS.get(normalized);rowResult.externalId=row.get(externalField)==null?null:String.valueOf(row.get(externalField)).trim();
                if(String.isNotBlank(rowResult.externalId)){String key=rowResult.externalId.toLowerCase();if(seen.contains(key))errors.add('Duplicate external identity in the same batch.');else seen.add(key);}
                for(String field:DATE_FIELDS)if(row.containsKey(field)&&row.get(field)!=null&&String.isNotBlank(String.valueOf(row.get(field))))try{Date.valueOf(String.valueOf(row.get(field)));}catch(Exception failure){errors.add(field+' must use YYYY-MM-DD.');}
                validateGovernedValues(normalized,row,errors);
                for(Object value:row.values())if(value instanceof String&&isFormulaLike(String.valueOf(value)))errors.add('Formula-like cell content is not allowed.');
            }
            rowResult.valid=errors.isEmpty();rowResult.message=rowResult.valid?'Ready for governed commit.':String.join(errors,' ');if(rowResult.valid)result.validRows++;else result.invalidRows++;result.rows.add(rowResult);
        }
        result.valid=result.invalidRows==0&&result.totalRows>0;result.message=result.totalRows==0?'Add at least one row.':result.valid?'All '+result.totalRows+' rows passed pre-validation.':result.invalidRows+' of '+result.totalRows+' rows require correction.';result.errorCsv=errorCsv(result.rows);return result;
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult executeBatch(String entityType,String jsonRows,String sourceFileName,String commitMode){
        Resource360Security.requirePermission('Resource360_Manage_Bulk_Operations','Bulk-operation permission is required.');
        Resource360Security.requirePermission('Resource360_Manage_Integrations','Integration permission is required to commit a bulk batch.');
        String mode=String.isBlank(commitMode)?'Atomic':commitMode.trim();if(!new Set<String>{'Atomic','Partial'}.contains(mode))fail('Commit mode must be Atomic or Partial.');BulkPreview checked=preview(entityType,jsonRows);if(checked.totalRows==0)fail('Add at least one row before commit.');if(mode=='Atomic'&&!checked.valid)fail('Atomic commit blocked because pre-validation found row errors.');
        List<Object> source=parse(jsonRows);List<Object> accepted=new List<Object>();for(Integer index=0;index<source.size();index++)if(checked.rows[index].valid)accepted.add(source[index]);if(accepted.isEmpty())fail('No valid rows are available to commit.');
        String runId='BULK-'+checked.fileHash.substring(0,24);Map<String,Object> envelope=new Map<String,Object>{'runId'=>runId,'sourceSystem'=>'Resource360 Controlled Import','entityType'=>checked.entityType,'contractVersion'=>Resource360GovernanceService.currentContractVersion(),'sourceCutoff'=>System.now().formatGmt('yyyy-MM-dd\'T\'HH:mm:ss\'Z\''),'allOrNone'=>mode=='Atomic','records'=>accepted};
        RestRequest priorRequest=RestContext.request;RestResponse priorResponse=RestContext.response;Resource360InboundApi.ApiResponse response;
        try{RestRequest request=new RestRequest();request.requestUri='/services/apexrest/resource360/v1/master-data/'+checked.entityType.toLowerCase();request.httpMethod='POST';request.requestBody=Blob.valueOf(JSON.serialize(envelope));RestContext.request=request;RestContext.response=new RestResponse();response=Resource360InboundApi.ingest();}finally{RestContext.request=priorRequest;RestContext.response=priorResponse;}
        R360_Integration_Run__c run=[SELECT Id FROM R360_Integration_Run__c WHERE Run_ID__c=:runId WITH USER_MODE LIMIT 1];run.Source_File_Name__c=sanitizeFileName(sourceFileName);run.Source_File_Hash__c=checked.fileHash;run.Commit_Mode__c=mode;update run;
        String correlation=EncodingUtil.convertToHex(Crypto.generateAesKey(128));Resource360AuditService.record(correlation,Resource360Security.decisionRole('Resource360_Manage_Bulk_Operations','Operations'),'BULK_IMPORT_COMMITTED','R360_Integration_Run__c',run.Id,1,mode.toUpperCase()+'_COMMIT','Controlled '+checked.entityType+' batch '+runId+' committed from '+run.Source_File_Name__c+'; payload hash '+checked.fileHash+'.',null,new Map<String,Object>{'runId'=>runId,'state'=>response.state,'processed'=>response.processed,'succeeded'=>response.succeeded,'failed'=>response.failed,'fileHash'=>checked.fileHash});
        return new Resource360Service.ServiceResult(response.state!='Failed','Batch '+runId+' completed as '+response.state+': '+response.succeeded+' succeeded, '+response.failed+' failed. '+response.message,run.Id,correlation);
    }

    private static List<Object> parse(String jsonRows){if(String.isBlank(jsonRows))return new List<Object>();try{Object parsed=JSON.deserializeUntyped(jsonRows);if(!(parsed instanceof List<Object>))fail('Bulk payload must be a JSON array of row objects.');return (List<Object>)parsed;}catch(AuraHandledException handled){throw handled;}catch(Exception failure){fail('Bulk JSON could not be parsed: '+failure.getMessage());}return new List<Object>();}
    private static String normalize(String entityType){String value=String.isBlank(entityType)?'':entityType.replace(' ','').toLowerCase();if(!REQUIRED_FIELDS.containsKey(value))fail('Unsupported entity type. Use Employee, Engagement, Capability, Credential, Learning Achievement, Commercial Reference, Org Unit or Portfolio.');return value;}
    private static String canonical(String value){return new Map<String,String>{'employee'=>'Employee','engagement'=>'Engagement','capability'=>'Capability','credential'=>'Credential','learningachievement'=>'LearningAchievement','commercialreference'=>'CommercialReference','orgunit'=>'OrgUnit','portfolio'=>'Portfolio'}.get(value);}
    private static void validateGovernedValues(String entityType,Map<String,Object> row,List<String> errors){
        if(entityType=='employee'){
            validatePicklist(row,'tower',Resource__c.Tower__c,errors);validatePicklist(row,'status',Resource__c.Status__c,errors);
            validateRange(row,'dailyCapacityHours',0,24,false,errors);validateRange(row,'availablePercent',0,100,true,errors);
        }else if(entityType=='engagement'){
            validatePicklist(row,'status',Engagement__c.Status__c,errors);validatePicklist(row,'revenueType',Engagement__c.Revenue_Type__c,errors);validatePicklist(row,'currency',Engagement__c.Currency_Code__c,errors);validatePicklist(row,'confidentiality',Engagement__c.Confidentiality__c,errors);
        }else if(entityType=='capability')validatePicklist(row,'type',Capability__c.Type__c,errors);
        else if(entityType=='credential')validatePicklist(row,'state',Credential__c.State__c,errors);
    }
    private static void validatePicklist(Map<String,Object> row,String key,Schema.SObjectField field,List<String> errors){if(!row.containsKey(key)||row.get(key)==null||String.isBlank(String.valueOf(row.get(key))))return;Set<String>allowed=new Set<String>();for(Schema.PicklistEntry entry:field.getDescribe().getPicklistValues())if(entry.isActive())allowed.add(entry.getValue());if(!allowed.contains(String.valueOf(row.get(key))))errors.add(key+' is not an active governed value.');}
    private static void validateRange(Map<String,Object>row,String key,Decimal minimum,Decimal maximum,Boolean minimumInclusive,List<String>errors){if(!row.containsKey(key)||row.get(key)==null)return;try{Decimal value=Decimal.valueOf(String.valueOf(row.get(key)));if((minimumInclusive?value<minimum:value<=minimum)||value>maximum)errors.add(key+' must be '+(minimumInclusive?'at least ':'greater than ')+minimum+' and no more than '+maximum+'.');}catch(Exception failure){errors.add(key+' must be numeric.');}}
    private static Boolean isFormulaLike(String value){String trimmed=value.trim();return trimmed.startsWith('=')||trimmed.startsWith('+')||trimmed.startsWith('@');}
    private static String errorCsv(List<RowResult> rows){List<String>lines=new List<String>{'row_number,external_id,status,message'};for(RowResult row:rows)if(!row.valid)lines.add(String.valueOf(row.rowNumber)+','+csv(row.externalId)+',INVALID,'+csv(row.message));return lines.size()==1?'':String.join(lines,'\n');}
    private static String csv(String value){String safe=value==null?'':value.replace('"','""');return '"'+safe+'"';}
    private static String sanitizeFileName(String value){String result=String.isBlank(value)?'controlled-import.json':value.replace('\r',' ').replace('\n',' ').trim();return result.length()>255?result.substring(0,255):result;}
    private static String hash(String value){return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(value==null?'':value)));}
    private static void fail(String message){throw new AuraHandledException(message);}
}
