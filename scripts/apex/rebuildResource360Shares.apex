Set<Id> demoUserIds = new Set<Id>();
for (User demoUser : [SELECT Id FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%' AND IsActive=true]) demoUserIds.add(demoUser.Id);
Resource360ScopeSharingService.rebuildUsers(demoUserIds);
System.debug(LoggingLevel.INFO, 'Rebuilt Resource 360 scope shares for ' + demoUserIds.size() + ' active demo users.');
