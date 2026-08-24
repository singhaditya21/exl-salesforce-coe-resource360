public inherited sharing class Resource360FreshnessService {
    public class FreshnessStatus {
        @AuraEnabled public String source;
        @AuraEnabled public String state;
        @AuraEnabled public DateTime lastSync;
        @AuraEnabled public Decimal ageHours;
        @AuraEnabled public Decimal warningHours;
        @AuraEnabled public Decimal blockingHours;
        @AuraEnabled public String message;
    }

    public static void requireStaffingFresh(Id resourceId, Id engagementId) {
        Resource__c resource=[SELECT Id,Source_Last_Sync__c FROM Resource__c WHERE Id=:resourceId WITH USER_MODE LIMIT 1];
        Engagement__c engagement=[SELECT Id,Source_Last_Sync__c FROM Engagement__c WHERE Id=:engagementId WITH USER_MODE LIMIT 1];
        requireStaffingFresh(resource.Source_Last_Sync__c,engagement.Source_Last_Sync__c);
    }

    public static void requireStaffingFresh(DateTime resourceLastSync,DateTime engagementLastSync) {
        requireRecent('EXL People Master',resourceLastSync,Resource360Policy.numberValue('People_Freshness_Block_Hours',24));
        requireRecent('EXL Engagement Master',engagementLastSync,Resource360Policy.numberValue('Engagement_Freshness_Block_Hours',4));
    }

    public static void requireCommercialFresh(DateTime lastSync) {
        requireRecent('EXL Commercial Master',lastSync,Resource360Policy.numberValue('Commercial_Freshness_Block_Hours',24));
    }

    public static Map<String,Object> configuredThresholds() {
        return new Map<String,Object>{
            'peopleWarnHours'=>Resource360Policy.numberValue('People_Freshness_Warn_Hours',8),
            'peopleBlockHours'=>Resource360Policy.numberValue('People_Freshness_Block_Hours',24),
            'engagementBlockHours'=>Resource360Policy.numberValue('Engagement_Freshness_Block_Hours',4),
            'commercialBlockHours'=>Resource360Policy.numberValue('Commercial_Freshness_Block_Hours',24),
            'learningWarnHours'=>Resource360Policy.numberValue('Learning_Freshness_Warn_Hours',48),
            'learningDisableHours'=>Resource360Policy.numberValue('Learning_Freshness_Disable_Hours',168)
        };
    }

    public static FreshnessStatus status(String source,DateTime lastSync,Decimal warningHours,Decimal blockingHours) {
        FreshnessStatus result=new FreshnessStatus();result.source=source;result.lastSync=lastSync;result.warningHours=warningHours;result.blockingHours=blockingHours;
        if(lastSync==null){result.state='Unavailable';result.message=source+' has no authoritative source timestamp.';return result;}
        result.ageHours=Decimal.valueOf(String.valueOf(System.now().getTime()-lastSync.getTime())).abs().divide(3600000,2);
        if(blockingHours!=null&&result.ageHours>blockingHours){result.state='Blocked';result.message=source+' is older than the configured '+blockingHours+'-hour blocking threshold.';}
        else if(warningHours!=null&&result.ageHours>warningHours){result.state='Stale';result.message=source+' is older than the configured '+warningHours+'-hour warning threshold.';}
        else{result.state='Fresh';result.message=source+' is within its governed freshness threshold.';}
        return result;
    }

    private static void requireRecent(String source,DateTime lastSync,Decimal maximumHours) {
        if(lastSync==null)fail(source+' freshness is unknown. Refresh the affected source record before this decision.');
        Long ageMilliseconds=System.now().getTime()-lastSync.getTime();
        if(ageMilliseconds>Long.valueOf(String.valueOf((maximumHours*3600000).setScale(0))))fail(source+' data is older than the configured '+maximumHours+'-hour limit. Refresh it before this decision.');
    }
    private static void fail(String message){throw new AuraHandledException(message);}
}
