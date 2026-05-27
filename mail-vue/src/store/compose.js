import { defineStore } from 'pinia'
import { useAccountStore } from './account.js'
import { useUserStore } from './user.js'

export const useComposeStore = defineStore('compose', {
    state: () => ({
        sendEmail: '',
        receiveEmail: [],
        accountId: -1,
        name: '',
        subject: '',
        content: '',
        sendType: '',
        text: '',
        emailId: 0,
        attachments: [],
        draftId: null,
        backReply: {
            receiveEmail: [],
            subject: '',
            content: '',
            sendType: ''
        },
        fromPath: '/inbox',
        isNewTab: false
    }),
    actions: {
        initFromAccount() {
            const accountStore = useAccountStore()
            const userStore = useUserStore()
            if (!accountStore.currentAccount.email) {
                this.sendEmail = userStore.user.email
                this.accountId = userStore.user.account.accountId
                this.name = userStore.user.name
            } else {
                this.sendEmail = accountStore.currentAccount.email
                this.accountId = accountStore.currentAccount.accountId
                this.name = accountStore.currentAccount.name
            }
        },
        setForm(data) {
            this.sendEmail = data.sendEmail || ''
            this.receiveEmail = data.receiveEmail || []
            this.accountId = data.accountId ?? -1
            this.name = data.name || ''
            this.subject = data.subject || ''
            this.content = data.content || ''
            this.sendType = data.sendType || ''
            this.text = data.text || ''
            this.emailId = data.emailId || 0
            this.attachments = data.attachments || []
            this.draftId = data.draftId ?? null
        },
        setBackReply(data) {
            this.backReply = { ...data }
        },
        setFromPath(path) {
            this.fromPath = path || '/inbox'
        },
        setIsNewTab(val) {
            this.isNewTab = val
        },
        clearForm() {
            this.receiveEmail = []
            this.subject = ''
            this.content = ''
            this.sendType = ''
            this.emailId = 0
            this.attachments = []
            this.draftId = null
            this.backReply = { receiveEmail: [], subject: '', content: '', sendType: '' }
        },
        reset() {
            this.sendEmail = ''
            this.receiveEmail = []
            this.accountId = -1
            this.name = ''
            this.subject = ''
            this.content = ''
            this.sendType = ''
            this.text = ''
            this.emailId = 0
            this.attachments = []
            this.draftId = null
            this.backReply = { receiveEmail: [], subject: '', content: '', sendType: '' }
            this.fromPath = '/inbox'
            this.isNewTab = false
        }
    }
})