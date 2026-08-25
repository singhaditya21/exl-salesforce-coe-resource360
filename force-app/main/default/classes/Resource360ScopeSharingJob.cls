public without sharing class Resource360ScopeSharingJob implements Queueable {
    private Set<Id> userIds;

    public Resource360ScopeSharingJob(Set<Id> userIds) {
        this.userIds = userIds == null ? new Set<Id>() : userIds.clone();
    }

    public void execute(QueueableContext context) {
        if (userIds.isEmpty()) return;
        List<Id> orderedUserIds = new List<Id>(userIds);
        orderedUserIds.sort();
        Integer chunkSize = Math.min(3, orderedUserIds.size());
        for (Integer index = 0; index < chunkSize; index++) {
            Id currentUserId = orderedUserIds[index];
            userIds.remove(currentUserId);
            Resource360ScopeSharingService.rebuildUser(currentUserId);
        }
        if (!userIds.isEmpty()) System.enqueueJob(new Resource360ScopeSharingJob(userIds));
    }
}
