public inherited sharing class Resource360CalendarService {
    public class CapacityCheck {
        @AuraEnabled public Boolean allowed;
        @AuraEnabled public Date conflictDate;
        @AuraEnabled public Decimal capacityHours;
        @AuraEnabled public Decimal committedHours;
        @AuraEnabled public Decimal requestedHours;
        @AuraEnabled public Integer workingDays;
        @AuraEnabled public String message;
    }

    public static CapacityCheck checkCapacity(Id resourceId, Date startDate, Date endDate, Decimal requestedHours, Id excludedAllocationId) {
        if (resourceId == null || startDate == null || endDate == null || endDate < startDate || requestedHours == null || requestedHours <= 0) {
            throw new AuraHandledException('Provide a resource, inclusive dates and positive daily hours.');
        }
        Integer rangeDays = startDate.daysBetween(endDate) + 1;
        if (rangeDays > 1100) throw new AuraHandledException('A capacity check cannot exceed 36 months.');

        Resource__c resource = [
            SELECT Id, Status__c, Employment_Start__c, Employment_End__c, Daily_Capacity_Hours__c,
                Work_Calendar__c, Work_Calendar__r.Work_Days__c, Work_Calendar__r.Daily_Capacity_Hours__c,
                Work_Calendar__r.Effective_From__c, Work_Calendar__r.Effective_To__c, Work_Calendar__r.Current__c
            FROM Resource__c WHERE Id = :resourceId WITH USER_MODE LIMIT 1 FOR UPDATE
        ];
        if (resource.Status__c != 'Active' || (resource.Employment_Start__c != null && startDate < resource.Employment_Start__c) ||
            (resource.Employment_End__c != null && endDate > resource.Employment_End__c)) {
            throw new AuraHandledException('The resource is not active for the complete requested range.');
        }

        Map<Date, Decimal> exceptionCapacity = new Map<Date, Decimal>();
        if (resource.Work_Calendar__c != null) {
            for (R360_Calendar_Exception__c exceptionRecord : [
                SELECT Exception_Date__c, Capacity_Hours__c FROM R360_Calendar_Exception__c
                WHERE Calendar__c = :resource.Work_Calendar__c AND Exception_Date__c >= :startDate AND Exception_Date__c <= :endDate
                WITH USER_MODE
            ]) {
                exceptionCapacity.put(exceptionRecord.Exception_Date__c, exceptionRecord.Capacity_Hours__c);
            }
        }

        List<Allocation__c> allocations = [
            SELECT Id, Start_Date__c, End_Date__c, Daily_Hours__c FROM Allocation__c
            WHERE Resource__c = :resourceId AND State__c = 'Accepted' AND Current__c = true
                AND Start_Date__c <= :endDate AND End_Date__c >= :startDate
            WITH USER_MODE
        ];
        CapacityCheck result = new CapacityCheck();
        result.allowed = true;
        result.requestedHours = requestedHours;
        result.workingDays = 0;
        for (Integer offset = 0; offset < rangeDays; offset++) {
            Date workDate = startDate.addDays(offset);
            Decimal capacity = capacityFor(resource, workDate, exceptionCapacity);
            if (capacity <= 0) continue;
            result.workingDays++;
            Decimal committed = 0;
            for (Allocation__c allocation : allocations) {
                if ((excludedAllocationId == null || allocation.Id != excludedAllocationId) &&
                    allocation.Start_Date__c <= workDate && allocation.End_Date__c >= workDate) {
                    committed += allocation.Daily_Hours__c;
                }
            }
            if (committed + requestedHours > capacity) {
                result.allowed = false;
                result.conflictDate = workDate;
                result.capacityHours = capacity;
                result.committedHours = committed;
                result.message = 'Capacity exceeds ' + String.valueOf(capacity) + ' hours on ' + String.valueOf(workDate) + '.';
                return result;
            }
        }
        if (result.workingDays == 0) {
            result.allowed = false;
            result.message = 'The requested range contains no working days for the resource calendar.';
        } else {
            result.message = 'Capacity is available on every applicable working day.';
        }
        return result;
    }

    public static Decimal capacityForDate(Id resourceId, Date workDate) {
        Resource__c resource = [SELECT Id, Daily_Capacity_Hours__c, Work_Calendar__c, Work_Calendar__r.Work_Days__c,
            Work_Calendar__r.Daily_Capacity_Hours__c, Work_Calendar__r.Effective_From__c,
            Work_Calendar__r.Effective_To__c, Work_Calendar__r.Current__c
            FROM Resource__c WHERE Id = :resourceId WITH USER_MODE LIMIT 1];
        Map<Date, Decimal> exceptions = new Map<Date, Decimal>();
        if (resource.Work_Calendar__c != null) {
            for (R360_Calendar_Exception__c exceptionRecord : [SELECT Exception_Date__c, Capacity_Hours__c FROM R360_Calendar_Exception__c WHERE Calendar__c=:resource.Work_Calendar__c AND Exception_Date__c=:workDate WITH USER_MODE]) exceptions.put(workDate, exceptionRecord.Capacity_Hours__c);
        }
        return capacityFor(resource, workDate, exceptions);
    }

    private static Decimal capacityFor(Resource__c resource, Date workDate, Map<Date, Decimal> exceptions) {
        if (exceptions.containsKey(workDate)) return exceptions.get(workDate);
        if (resource.Work_Calendar__c != null && resource.Work_Calendar__r.Current__c &&
            workDate >= resource.Work_Calendar__r.Effective_From__c &&
            (resource.Work_Calendar__r.Effective_To__c == null || workDate <= resource.Work_Calendar__r.Effective_To__c)) {
            Integer dayNumber = isoWeekday(workDate);
            Set<String> workDays = new Set<String>(resource.Work_Calendar__r.Work_Days__c.split(','));
            return workDays.contains(String.valueOf(dayNumber)) ? resource.Work_Calendar__r.Daily_Capacity_Hours__c : 0;
        }
        Integer fallbackDay = isoWeekday(workDate);
        if (fallbackDay > 5) return 0;
        return resource.Daily_Capacity_Hours__c == null ? Resource360Policy.numberValue('Default_Daily_Capacity', 8) : resource.Daily_Capacity_Hours__c;
    }

    private static Integer isoWeekday(Date value) {
        Integer days = Date.newInstance(1900, 1, 1).daysBetween(value);
        return Math.mod(days, 7) + 1;
    }
}
