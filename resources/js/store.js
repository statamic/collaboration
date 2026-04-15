export function useCollaborationStore(channelName) {
    const useStore = Statamic.$pinia.defineStore(`collaboration/${channelName}`, {
        state: () => ({
            users: [],
        }),
        actions: {
            setUsers(users) {
                this.users = users;
            },
            addUser(user) {
                this.users.push(user);
            },
            removeUser(removedUser) {
                this.users = this.users.filter(user => user.id !== removedUser.id);
            },
        },
    });

    return useStore();
}
