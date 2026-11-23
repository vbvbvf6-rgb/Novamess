import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AddContactBody, AddMemberBody, AddReactionBody, AdminGiftInput, ArchiveAdminGift200, Call, Chat, ChatMember, CreateChatBody, CreatePostBody, CreatePostCommentBody, CreateStoryBody, EditMessageBody, GetMessagesParams, GetSecurityQuestionParams, GiftCollection, GiftExchangeResult, GiftInstance, GiftItem, GiftSendResult, HasSecurityQuestion200, HealthStatus, InitiateCallBody, Message, Post, PostComment, Reaction, ResetPassword200, ResetPasswordBody, SearchUsersParams, SecurityQuestionResponse, SendGiftBody, SendMessageBody, SetSecurityQuestion200, SetSecurityQuestionBody, Story, StoryGroup, UpdateCallBody, UpdateChatBody, UpdateUserBody, User, UserStats } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMeUrl: () => string;
/**
 * @summary Get current user
 */
export declare const getMe: (options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getGetMeQueryKey: () => readonly ["/api/users/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<unknown>;
/**
 * @summary Get current user
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateMeUrl: () => string;
/**
 * @summary Update current user profile
 */
export declare const updateMe: (updateUserBody: UpdateUserBody, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getUpdateMeMutationKey: () => readonly ["updateMe"];
export declare const getUpdateMeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, UpdateMeMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, UpdateMeMutationVariables, TContext>;
export type UpdateMeMutationResult = NonNullable<Awaited<ReturnType<typeof updateMe>>>;
export type UpdateMeMutationBody = BodyType<UpdateUserBody>;
export type UpdateMeMutationError = ErrorType<unknown>;
export type UpdateMeMutationVariables = {
    data: BodyType<UpdateUserBody>;
};
/**
* @summary Update current user profile
*/
export declare const useUpdateMe: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, UpdateMeMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMe>>, TError, UpdateMeMutationVariables, TContext>;
export declare const getSearchUsersUrl: (params: SearchUsersParams) => string;
/**
 * @summary Search users by username or name
 */
export declare const searchUsers: (params: SearchUsersParams, options?: Parameters<typeof customFetch>[1]) => Promise<User[]>;
export declare const getSearchUsersQueryKey: (params?: SearchUsersParams) => readonly ["/api/users/search", ...SearchUsersParams[]];
export declare const getSearchUsersQueryOptions: <TData = Awaited<ReturnType<typeof searchUsers>>, TError = ErrorType<unknown>>(params: SearchUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof searchUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SearchUsersQueryResult = NonNullable<Awaited<ReturnType<typeof searchUsers>>>;
export type SearchUsersQueryError = ErrorType<unknown>;
/**
 * @summary Search users by username or name
 */
export declare function useSearchUsers<TData = Awaited<ReturnType<typeof searchUsers>>, TError = ErrorType<unknown>>(params: SearchUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetUserByIdUrl: (userId: number) => string;
export declare const getUserById: (userId: number, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getGetUserByIdQueryKey: (userId: number) => readonly [`/api/users/${number}`];
export declare const getGetUserByIdQueryOptions: <TData = Awaited<ReturnType<typeof getUserById>>, TError = ErrorType<unknown>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserById>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserByIdQueryResult = NonNullable<Awaited<ReturnType<typeof getUserById>>>;
export type GetUserByIdQueryError = ErrorType<unknown>;
export declare function useGetUserById<TData = Awaited<ReturnType<typeof getUserById>>, TError = ErrorType<unknown>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetContactsUrl: () => string;
/**
 * @summary Get user contacts
 */
export declare const getContacts: (options?: Parameters<typeof customFetch>[1]) => Promise<User[]>;
export declare const getGetContactsQueryKey: () => readonly ["/api/contacts"];
export declare const getGetContactsQueryOptions: <TData = Awaited<ReturnType<typeof getContacts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getContacts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getContacts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetContactsQueryResult = NonNullable<Awaited<ReturnType<typeof getContacts>>>;
export type GetContactsQueryError = ErrorType<unknown>;
/**
 * @summary Get user contacts
 */
export declare function useGetContacts<TData = Awaited<ReturnType<typeof getContacts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getContacts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddContactUrl: () => string;
/**
 * @summary Add a contact
 */
export declare const addContact: (addContactBody: AddContactBody, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getAddContactMutationKey: () => readonly ["addContact"];
export declare const getAddContactMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addContact>>, TError, AddContactMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addContact>>, TError, AddContactMutationVariables, TContext>;
export type AddContactMutationResult = NonNullable<Awaited<ReturnType<typeof addContact>>>;
export type AddContactMutationBody = BodyType<AddContactBody>;
export type AddContactMutationError = ErrorType<unknown>;
export type AddContactMutationVariables = {
    data: BodyType<AddContactBody>;
};
/**
* @summary Add a contact
*/
export declare const useAddContact: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addContact>>, TError, AddContactMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addContact>>, TError, AddContactMutationVariables, TContext>;
export declare const getRemoveContactUrl: (contactId: number) => string;
export declare const removeContact: (contactId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getRemoveContactMutationKey: () => readonly ["removeContact"];
export declare const getRemoveContactMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeContact>>, TError, RemoveContactMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeContact>>, TError, RemoveContactMutationVariables, TContext>;
export type RemoveContactMutationResult = NonNullable<Awaited<ReturnType<typeof removeContact>>>;
export type RemoveContactMutationError = ErrorType<unknown>;
export type RemoveContactMutationVariables = {
    contactId: number;
};
export declare const useRemoveContact: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeContact>>, TError, RemoveContactMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeContact>>, TError, RemoveContactMutationVariables, TContext>;
export declare const getGetChatsUrl: () => string;
/**
 * @summary Get all chats for current user
 */
export declare const getChats: (options?: Parameters<typeof customFetch>[1]) => Promise<Chat[]>;
export declare const getGetChatsQueryKey: () => readonly ["/api/chats"];
export declare const getGetChatsQueryOptions: <TData = Awaited<ReturnType<typeof getChats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getChats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetChatsQueryResult = NonNullable<Awaited<ReturnType<typeof getChats>>>;
export type GetChatsQueryError = ErrorType<unknown>;
/**
 * @summary Get all chats for current user
 */
export declare function useGetChats<TData = Awaited<ReturnType<typeof getChats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateChatUrl: () => string;
/**
 * @summary Create a new chat or group
 */
export declare const createChat: (createChatBody: CreateChatBody, options?: Parameters<typeof customFetch>[1]) => Promise<Chat>;
export declare const getCreateChatMutationKey: () => readonly ["createChat"];
export declare const getCreateChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createChat>>, TError, CreateChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createChat>>, TError, CreateChatMutationVariables, TContext>;
export type CreateChatMutationResult = NonNullable<Awaited<ReturnType<typeof createChat>>>;
export type CreateChatMutationBody = BodyType<CreateChatBody>;
export type CreateChatMutationError = ErrorType<unknown>;
export type CreateChatMutationVariables = {
    data: BodyType<CreateChatBody>;
};
/**
* @summary Create a new chat or group
*/
export declare const useCreateChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createChat>>, TError, CreateChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createChat>>, TError, CreateChatMutationVariables, TContext>;
export declare const getGetChatByIdUrl: (chatId: number) => string;
export declare const getChatById: (chatId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Chat>;
export declare const getGetChatByIdQueryKey: (chatId: number) => readonly [`/api/chats/${number}`];
export declare const getGetChatByIdQueryOptions: <TData = Awaited<ReturnType<typeof getChatById>>, TError = ErrorType<unknown>>(chatId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChatById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getChatById>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetChatByIdQueryResult = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type GetChatByIdQueryError = ErrorType<unknown>;
export declare function useGetChatById<TData = Awaited<ReturnType<typeof getChatById>>, TError = ErrorType<unknown>>(chatId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChatById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateChatUrl: (chatId: number) => string;
export declare const updateChat: (chatId: number, updateChatBody: UpdateChatBody, options?: Parameters<typeof customFetch>[1]) => Promise<Chat>;
export declare const getUpdateChatMutationKey: () => readonly ["updateChat"];
export declare const getUpdateChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateChat>>, TError, UpdateChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateChat>>, TError, UpdateChatMutationVariables, TContext>;
export type UpdateChatMutationResult = NonNullable<Awaited<ReturnType<typeof updateChat>>>;
export type UpdateChatMutationBody = BodyType<UpdateChatBody>;
export type UpdateChatMutationError = ErrorType<unknown>;
export type UpdateChatMutationVariables = {
    chatId: number;
    data: BodyType<UpdateChatBody>;
};
export declare const useUpdateChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateChat>>, TError, UpdateChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateChat>>, TError, UpdateChatMutationVariables, TContext>;
export declare const getDeleteChatUrl: (chatId: number) => string;
export declare const deleteChat: (chatId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteChatMutationKey: () => readonly ["deleteChat"];
export declare const getDeleteChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteChat>>, TError, DeleteChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteChat>>, TError, DeleteChatMutationVariables, TContext>;
export type DeleteChatMutationResult = NonNullable<Awaited<ReturnType<typeof deleteChat>>>;
export type DeleteChatMutationError = ErrorType<unknown>;
export type DeleteChatMutationVariables = {
    chatId: number;
};
export declare const useDeleteChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteChat>>, TError, DeleteChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteChat>>, TError, DeleteChatMutationVariables, TContext>;
export declare const getGetChatMembersUrl: (chatId: number) => string;
export declare const getChatMembers: (chatId: number, options?: Parameters<typeof customFetch>[1]) => Promise<ChatMember[]>;
export declare const getGetChatMembersQueryKey: (chatId: number) => readonly [`/api/chats/${number}/members`];
export declare const getGetChatMembersQueryOptions: <TData = Awaited<ReturnType<typeof getChatMembers>>, TError = ErrorType<unknown>>(chatId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChatMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getChatMembers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetChatMembersQueryResult = NonNullable<Awaited<ReturnType<typeof getChatMembers>>>;
export type GetChatMembersQueryError = ErrorType<unknown>;
export declare function useGetChatMembers<TData = Awaited<ReturnType<typeof getChatMembers>>, TError = ErrorType<unknown>>(chatId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChatMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddChatMemberUrl: (chatId: number) => string;
export declare const addChatMember: (chatId: number, addMemberBody: AddMemberBody, options?: Parameters<typeof customFetch>[1]) => Promise<ChatMember>;
export declare const getAddChatMemberMutationKey: () => readonly ["addChatMember"];
export declare const getAddChatMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addChatMember>>, TError, AddChatMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addChatMember>>, TError, AddChatMemberMutationVariables, TContext>;
export type AddChatMemberMutationResult = NonNullable<Awaited<ReturnType<typeof addChatMember>>>;
export type AddChatMemberMutationBody = BodyType<AddMemberBody>;
export type AddChatMemberMutationError = ErrorType<unknown>;
export type AddChatMemberMutationVariables = {
    chatId: number;
    data: BodyType<AddMemberBody>;
};
export declare const useAddChatMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addChatMember>>, TError, AddChatMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addChatMember>>, TError, AddChatMemberMutationVariables, TContext>;
export declare const getRemoveChatMemberUrl: (chatId: number, memberId: number) => string;
export declare const removeChatMember: (chatId: number, memberId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getRemoveChatMemberMutationKey: () => readonly ["removeChatMember"];
export declare const getRemoveChatMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeChatMember>>, TError, RemoveChatMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeChatMember>>, TError, RemoveChatMemberMutationVariables, TContext>;
export type RemoveChatMemberMutationResult = NonNullable<Awaited<ReturnType<typeof removeChatMember>>>;
export type RemoveChatMemberMutationError = ErrorType<unknown>;
export type RemoveChatMemberMutationVariables = {
    chatId: number;
    memberId: number;
};
export declare const useRemoveChatMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeChatMember>>, TError, RemoveChatMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeChatMember>>, TError, RemoveChatMemberMutationVariables, TContext>;
export declare const getPinChatUrl: (chatId: number) => string;
export declare const pinChat: (chatId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Chat>;
export declare const getPinChatMutationKey: () => readonly ["pinChat"];
export declare const getPinChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof pinChat>>, TError, PinChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof pinChat>>, TError, PinChatMutationVariables, TContext>;
export type PinChatMutationResult = NonNullable<Awaited<ReturnType<typeof pinChat>>>;
export type PinChatMutationError = ErrorType<unknown>;
export type PinChatMutationVariables = {
    chatId: number;
};
export declare const usePinChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof pinChat>>, TError, PinChatMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof pinChat>>, TError, PinChatMutationVariables, TContext>;
export declare const getGetMessagesUrl: (params: GetMessagesParams) => string;
/**
 * @summary Get messages for a chat
 */
export declare const getMessages: (params: GetMessagesParams, options?: Parameters<typeof customFetch>[1]) => Promise<Message[]>;
export declare const getGetMessagesQueryKey: (params?: GetMessagesParams) => readonly ["/api/messages", ...GetMessagesParams[]];
export declare const getGetMessagesQueryOptions: <TData = Awaited<ReturnType<typeof getMessages>>, TError = ErrorType<unknown>>(params: GetMessagesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof getMessages>>>;
export type GetMessagesQueryError = ErrorType<unknown>;
/**
 * @summary Get messages for a chat
 */
export declare function useGetMessages<TData = Awaited<ReturnType<typeof getMessages>>, TError = ErrorType<unknown>>(params: GetMessagesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSendMessageUrl: () => string;
/**
 * @summary Send a message
 */
export declare const sendMessage: (sendMessageBody: SendMessageBody, options?: Parameters<typeof customFetch>[1]) => Promise<Message>;
export declare const getSendMessageMutationKey: () => readonly ["sendMessage"];
export declare const getSendMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, SendMessageMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, SendMessageMutationVariables, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = BodyType<SendMessageBody>;
export type SendMessageMutationError = ErrorType<unknown>;
export type SendMessageMutationVariables = {
    data: BodyType<SendMessageBody>;
};
/**
* @summary Send a message
*/
export declare const useSendMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, SendMessageMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, SendMessageMutationVariables, TContext>;
export declare const getEditMessageUrl: (messageId: number) => string;
export declare const editMessage: (messageId: number, editMessageBody: EditMessageBody, options?: Parameters<typeof customFetch>[1]) => Promise<Message>;
export declare const getEditMessageMutationKey: () => readonly ["editMessage"];
export declare const getEditMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, EditMessageMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, EditMessageMutationVariables, TContext>;
export type EditMessageMutationResult = NonNullable<Awaited<ReturnType<typeof editMessage>>>;
export type EditMessageMutationBody = BodyType<EditMessageBody>;
export type EditMessageMutationError = ErrorType<unknown>;
export type EditMessageMutationVariables = {
    messageId: number;
    data: BodyType<EditMessageBody>;
};
export declare const useEditMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, EditMessageMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof editMessage>>, TError, EditMessageMutationVariables, TContext>;
export declare const getDeleteMessageUrl: (messageId: number) => string;
export declare const deleteMessage: (messageId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteMessageMutationKey: () => readonly ["deleteMessage"];
export declare const getDeleteMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, DeleteMessageMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, DeleteMessageMutationVariables, TContext>;
export type DeleteMessageMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMessage>>>;
export type DeleteMessageMutationError = ErrorType<unknown>;
export type DeleteMessageMutationVariables = {
    messageId: number;
};
export declare const useDeleteMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, DeleteMessageMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMessage>>, TError, DeleteMessageMutationVariables, TContext>;
export declare const getAddReactionUrl: (messageId: number) => string;
export declare const addReaction: (messageId: number, addReactionBody: AddReactionBody, options?: Parameters<typeof customFetch>[1]) => Promise<Reaction>;
export declare const getAddReactionMutationKey: () => readonly ["addReaction"];
export declare const getAddReactionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addReaction>>, TError, AddReactionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addReaction>>, TError, AddReactionMutationVariables, TContext>;
export type AddReactionMutationResult = NonNullable<Awaited<ReturnType<typeof addReaction>>>;
export type AddReactionMutationBody = BodyType<AddReactionBody>;
export type AddReactionMutationError = ErrorType<unknown>;
export type AddReactionMutationVariables = {
    messageId: number;
    data: BodyType<AddReactionBody>;
};
export declare const useAddReaction: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addReaction>>, TError, AddReactionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addReaction>>, TError, AddReactionMutationVariables, TContext>;
export declare const getRemoveReactionUrl: (messageId: number) => string;
export declare const removeReaction: (messageId: number, addReactionBody: AddReactionBody, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getRemoveReactionMutationKey: () => readonly ["removeReaction"];
export declare const getRemoveReactionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeReaction>>, TError, RemoveReactionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeReaction>>, TError, RemoveReactionMutationVariables, TContext>;
export type RemoveReactionMutationResult = NonNullable<Awaited<ReturnType<typeof removeReaction>>>;
export type RemoveReactionMutationBody = BodyType<AddReactionBody>;
export type RemoveReactionMutationError = ErrorType<unknown>;
export type RemoveReactionMutationVariables = {
    messageId: number;
    data: BodyType<AddReactionBody>;
};
export declare const useRemoveReaction: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeReaction>>, TError, RemoveReactionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeReaction>>, TError, RemoveReactionMutationVariables, TContext>;
export declare const getGetCallHistoryUrl: () => string;
/**
 * @summary Get call history
 */
export declare const getCallHistory: (options?: Parameters<typeof customFetch>[1]) => Promise<Call[]>;
export declare const getGetCallHistoryQueryKey: () => readonly ["/api/calls"];
export declare const getGetCallHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getCallHistory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCallHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCallHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCallHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getCallHistory>>>;
export type GetCallHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get call history
 */
export declare function useGetCallHistory<TData = Awaited<ReturnType<typeof getCallHistory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCallHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getInitiateCallUrl: () => string;
/**
 * @summary Initiate a call
 */
export declare const initiateCall: (initiateCallBody: InitiateCallBody, options?: Parameters<typeof customFetch>[1]) => Promise<Call>;
export declare const getInitiateCallMutationKey: () => readonly ["initiateCall"];
export declare const getInitiateCallMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiateCall>>, TError, InitiateCallMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof initiateCall>>, TError, InitiateCallMutationVariables, TContext>;
export type InitiateCallMutationResult = NonNullable<Awaited<ReturnType<typeof initiateCall>>>;
export type InitiateCallMutationBody = BodyType<InitiateCallBody>;
export type InitiateCallMutationError = ErrorType<unknown>;
export type InitiateCallMutationVariables = {
    data: BodyType<InitiateCallBody>;
};
/**
* @summary Initiate a call
*/
export declare const useInitiateCall: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiateCall>>, TError, InitiateCallMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof initiateCall>>, TError, InitiateCallMutationVariables, TContext>;
export declare const getGetCallByIdUrl: (callId: number) => string;
export declare const getCallById: (callId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Call>;
export declare const getGetCallByIdQueryKey: (callId: number) => readonly [`/api/calls/${number}`];
export declare const getGetCallByIdQueryOptions: <TData = Awaited<ReturnType<typeof getCallById>>, TError = ErrorType<unknown>>(callId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCallById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCallById>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCallByIdQueryResult = NonNullable<Awaited<ReturnType<typeof getCallById>>>;
export type GetCallByIdQueryError = ErrorType<unknown>;
export declare function useGetCallById<TData = Awaited<ReturnType<typeof getCallById>>, TError = ErrorType<unknown>>(callId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCallById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateCallStatusUrl: (callId: number) => string;
export declare const updateCallStatus: (callId: number, updateCallBody: UpdateCallBody, options?: Parameters<typeof customFetch>[1]) => Promise<Call>;
export declare const getUpdateCallStatusMutationKey: () => readonly ["updateCallStatus"];
export declare const getUpdateCallStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCallStatus>>, TError, UpdateCallStatusMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCallStatus>>, TError, UpdateCallStatusMutationVariables, TContext>;
export type UpdateCallStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateCallStatus>>>;
export type UpdateCallStatusMutationBody = BodyType<UpdateCallBody>;
export type UpdateCallStatusMutationError = ErrorType<unknown>;
export type UpdateCallStatusMutationVariables = {
    callId: number;
    data: BodyType<UpdateCallBody>;
};
export declare const useUpdateCallStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCallStatus>>, TError, UpdateCallStatusMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCallStatus>>, TError, UpdateCallStatusMutationVariables, TContext>;
export declare const getGetGiftCatalogUrl: () => string;
/**
 * @summary Get available gift catalog
 */
export declare const getGiftCatalog: (options?: Parameters<typeof customFetch>[1]) => Promise<GiftItem[]>;
export declare const getGetGiftCatalogQueryKey: () => readonly ["/api/gifts"];
export declare const getGetGiftCatalogQueryOptions: <TData = Awaited<ReturnType<typeof getGiftCatalog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGiftCatalog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGiftCatalog>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGiftCatalogQueryResult = NonNullable<Awaited<ReturnType<typeof getGiftCatalog>>>;
export type GetGiftCatalogQueryError = ErrorType<unknown>;
/**
 * @summary Get available gift catalog
 */
export declare function useGetGiftCatalog<TData = Awaited<ReturnType<typeof getGiftCatalog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGiftCatalog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMyGiftsUrl: () => string;
/**
 * @summary Get gifts received and sent by current user
 */
export declare const getMyGifts: (options?: Parameters<typeof customFetch>[1]) => Promise<GiftCollection>;
export declare const getGetMyGiftsQueryKey: () => readonly ["/api/gifts/mine"];
export declare const getGetMyGiftsQueryOptions: <TData = Awaited<ReturnType<typeof getMyGifts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyGifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyGifts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyGiftsQueryResult = NonNullable<Awaited<ReturnType<typeof getMyGifts>>>;
export type GetMyGiftsQueryError = ErrorType<unknown>;
/**
 * @summary Get gifts received and sent by current user
 */
export declare function useGetMyGifts<TData = Awaited<ReturnType<typeof getMyGifts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyGifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSentGiftsUrl: () => string;
/**
 * @summary Get gifts sent by current user
 */
export declare const getSentGifts: (options?: Parameters<typeof customFetch>[1]) => Promise<GiftInstance[]>;
export declare const getGetSentGiftsQueryKey: () => readonly ["/api/gifts/sent"];
export declare const getGetSentGiftsQueryOptions: <TData = Awaited<ReturnType<typeof getSentGifts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSentGifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSentGifts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSentGiftsQueryResult = NonNullable<Awaited<ReturnType<typeof getSentGifts>>>;
export type GetSentGiftsQueryError = ErrorType<unknown>;
/**
 * @summary Get gifts sent by current user
 */
export declare function useGetSentGifts<TData = Awaited<ReturnType<typeof getSentGifts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSentGifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetReceivedGiftsUrl: () => string;
/**
 * @summary Get gifts received by current user
 */
export declare const getReceivedGifts: (options?: Parameters<typeof customFetch>[1]) => Promise<GiftInstance[]>;
export declare const getGetReceivedGiftsQueryKey: () => readonly ["/api/gifts/received"];
export declare const getGetReceivedGiftsQueryOptions: <TData = Awaited<ReturnType<typeof getReceivedGifts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReceivedGifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getReceivedGifts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetReceivedGiftsQueryResult = NonNullable<Awaited<ReturnType<typeof getReceivedGifts>>>;
export type GetReceivedGiftsQueryError = ErrorType<unknown>;
/**
 * @summary Get gifts received by current user
 */
export declare function useGetReceivedGifts<TData = Awaited<ReturnType<typeof getReceivedGifts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReceivedGifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSendGiftUrl: () => string;
/**
 * @summary Send a gift to a user
 */
export declare const sendGift: (sendGiftBody: SendGiftBody, options?: Parameters<typeof customFetch>[1]) => Promise<GiftSendResult>;
export declare const getSendGiftMutationKey: () => readonly ["sendGift"];
export declare const getSendGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendGift>>, TError, SendGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendGift>>, TError, SendGiftMutationVariables, TContext>;
export type SendGiftMutationResult = NonNullable<Awaited<ReturnType<typeof sendGift>>>;
export type SendGiftMutationBody = BodyType<SendGiftBody>;
export type SendGiftMutationError = ErrorType<unknown>;
export type SendGiftMutationVariables = {
    data: BodyType<SendGiftBody>;
};
/**
* @summary Send a gift to a user
*/
export declare const useSendGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendGift>>, TError, SendGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendGift>>, TError, SendGiftMutationVariables, TContext>;
export declare const getOpenGiftUrl: (giftId: number) => string;
/**
 * @summary Open and keep a received gift
 */
export declare const openGift: (giftId: number, options?: Parameters<typeof customFetch>[1]) => Promise<GiftInstance>;
export declare const getOpenGiftMutationKey: () => readonly ["openGift"];
export declare const getOpenGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof openGift>>, TError, OpenGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof openGift>>, TError, OpenGiftMutationVariables, TContext>;
export type OpenGiftMutationResult = NonNullable<Awaited<ReturnType<typeof openGift>>>;
export type OpenGiftMutationError = ErrorType<unknown>;
export type OpenGiftMutationVariables = {
    giftId: number;
};
/**
* @summary Open and keep a received gift
*/
export declare const useOpenGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof openGift>>, TError, OpenGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof openGift>>, TError, OpenGiftMutationVariables, TContext>;
export declare const getUpgradeGiftUrl: (giftId: number) => string;
/**
 * @summary Upgrade a collectible gift
 */
export declare const upgradeGift: (giftId: number, options?: Parameters<typeof customFetch>[1]) => Promise<GiftInstance>;
export declare const getUpgradeGiftMutationKey: () => readonly ["upgradeGift"];
export declare const getUpgradeGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upgradeGift>>, TError, UpgradeGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upgradeGift>>, TError, UpgradeGiftMutationVariables, TContext>;
export type UpgradeGiftMutationResult = NonNullable<Awaited<ReturnType<typeof upgradeGift>>>;
export type UpgradeGiftMutationError = ErrorType<unknown>;
export type UpgradeGiftMutationVariables = {
    giftId: number;
};
/**
* @summary Upgrade a collectible gift
*/
export declare const useUpgradeGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upgradeGift>>, TError, UpgradeGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upgradeGift>>, TError, UpgradeGiftMutationVariables, TContext>;
export declare const getExchangeGiftUrl: (giftId: number) => string;
/**
 * @summary Exchange a gift for its listed value
 */
export declare const exchangeGift: (giftId: number, options?: Parameters<typeof customFetch>[1]) => Promise<GiftExchangeResult>;
export declare const getExchangeGiftMutationKey: () => readonly ["exchangeGift"];
export declare const getExchangeGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof exchangeGift>>, TError, ExchangeGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof exchangeGift>>, TError, ExchangeGiftMutationVariables, TContext>;
export type ExchangeGiftMutationResult = NonNullable<Awaited<ReturnType<typeof exchangeGift>>>;
export type ExchangeGiftMutationError = ErrorType<unknown>;
export type ExchangeGiftMutationVariables = {
    giftId: number;
};
/**
* @summary Exchange a gift for its listed value
*/
export declare const useExchangeGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof exchangeGift>>, TError, ExchangeGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof exchangeGift>>, TError, ExchangeGiftMutationVariables, TContext>;
export declare const getGetAdminGiftCatalogUrl: () => string;
/**
 * @summary Get the gift catalog for administration
 */
export declare const getAdminGiftCatalog: (options?: Parameters<typeof customFetch>[1]) => Promise<GiftItem[]>;
export declare const getGetAdminGiftCatalogQueryKey: () => readonly ["/api/admin/gifts"];
export declare const getGetAdminGiftCatalogQueryOptions: <TData = Awaited<ReturnType<typeof getAdminGiftCatalog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminGiftCatalog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminGiftCatalog>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminGiftCatalogQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminGiftCatalog>>>;
export type GetAdminGiftCatalogQueryError = ErrorType<unknown>;
/**
 * @summary Get the gift catalog for administration
 */
export declare function useGetAdminGiftCatalog<TData = Awaited<ReturnType<typeof getAdminGiftCatalog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminGiftCatalog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAdminGiftUrl: () => string;
/**
 * @summary Create a gift catalog item
 */
export declare const createAdminGift: (adminGiftInput: AdminGiftInput, options?: Parameters<typeof customFetch>[1]) => Promise<GiftItem>;
export declare const getCreateAdminGiftMutationKey: () => readonly ["createAdminGift"];
export declare const getCreateAdminGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAdminGift>>, TError, CreateAdminGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAdminGift>>, TError, CreateAdminGiftMutationVariables, TContext>;
export type CreateAdminGiftMutationResult = NonNullable<Awaited<ReturnType<typeof createAdminGift>>>;
export type CreateAdminGiftMutationBody = BodyType<AdminGiftInput>;
export type CreateAdminGiftMutationError = ErrorType<unknown>;
export type CreateAdminGiftMutationVariables = {
    data: BodyType<AdminGiftInput>;
};
/**
* @summary Create a gift catalog item
*/
export declare const useCreateAdminGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAdminGift>>, TError, CreateAdminGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAdminGift>>, TError, CreateAdminGiftMutationVariables, TContext>;
export declare const getUpdateAdminGiftUrl: (giftId: number) => string;
/**
 * @summary Update a gift catalog item
 */
export declare const updateAdminGift: (giftId: number, adminGiftInput: AdminGiftInput, options?: Parameters<typeof customFetch>[1]) => Promise<GiftItem>;
export declare const getUpdateAdminGiftMutationKey: () => readonly ["updateAdminGift"];
export declare const getUpdateAdminGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAdminGift>>, TError, UpdateAdminGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAdminGift>>, TError, UpdateAdminGiftMutationVariables, TContext>;
export type UpdateAdminGiftMutationResult = NonNullable<Awaited<ReturnType<typeof updateAdminGift>>>;
export type UpdateAdminGiftMutationBody = BodyType<AdminGiftInput>;
export type UpdateAdminGiftMutationError = ErrorType<unknown>;
export type UpdateAdminGiftMutationVariables = {
    giftId: number;
    data: BodyType<AdminGiftInput>;
};
/**
* @summary Update a gift catalog item
*/
export declare const useUpdateAdminGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAdminGift>>, TError, UpdateAdminGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAdminGift>>, TError, UpdateAdminGiftMutationVariables, TContext>;
export declare const getArchiveAdminGiftUrl: (giftId: number) => string;
/**
 * @summary Hide a gift from the catalog without deleting gift history
 */
export declare const archiveAdminGift: (giftId: number, options?: Parameters<typeof customFetch>[1]) => Promise<ArchiveAdminGift200>;
export declare const getArchiveAdminGiftMutationKey: () => readonly ["archiveAdminGift"];
export declare const getArchiveAdminGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveAdminGift>>, TError, ArchiveAdminGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveAdminGift>>, TError, ArchiveAdminGiftMutationVariables, TContext>;
export type ArchiveAdminGiftMutationResult = NonNullable<Awaited<ReturnType<typeof archiveAdminGift>>>;
export type ArchiveAdminGiftMutationError = ErrorType<unknown>;
export type ArchiveAdminGiftMutationVariables = {
    giftId: number;
};
/**
* @summary Hide a gift from the catalog without deleting gift history
*/
export declare const useArchiveAdminGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveAdminGift>>, TError, ArchiveAdminGiftMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveAdminGift>>, TError, ArchiveAdminGiftMutationVariables, TContext>;
export declare const getGetStoriesUrl: () => string;
/**
 * @summary Get stories from contacts
 */
export declare const getStories: (options?: Parameters<typeof customFetch>[1]) => Promise<StoryGroup[]>;
export declare const getGetStoriesQueryKey: () => readonly ["/api/stories"];
export declare const getGetStoriesQueryOptions: <TData = Awaited<ReturnType<typeof getStories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStoriesQueryResult = NonNullable<Awaited<ReturnType<typeof getStories>>>;
export type GetStoriesQueryError = ErrorType<unknown>;
/**
 * @summary Get stories from contacts
 */
export declare function useGetStories<TData = Awaited<ReturnType<typeof getStories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateStoryUrl: () => string;
/**
 * @summary Create a story
 */
export declare const createStory: (createStoryBody: CreateStoryBody, options?: Parameters<typeof customFetch>[1]) => Promise<Story>;
export declare const getCreateStoryMutationKey: () => readonly ["createStory"];
export declare const getCreateStoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStory>>, TError, CreateStoryMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createStory>>, TError, CreateStoryMutationVariables, TContext>;
export type CreateStoryMutationResult = NonNullable<Awaited<ReturnType<typeof createStory>>>;
export type CreateStoryMutationBody = BodyType<CreateStoryBody>;
export type CreateStoryMutationError = ErrorType<unknown>;
export type CreateStoryMutationVariables = {
    data: BodyType<CreateStoryBody>;
};
/**
* @summary Create a story
*/
export declare const useCreateStory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStory>>, TError, CreateStoryMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createStory>>, TError, CreateStoryMutationVariables, TContext>;
export declare const getDeleteStoryUrl: (storyId: number) => string;
export declare const deleteStory: (storyId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteStoryMutationKey: () => readonly ["deleteStory"];
export declare const getDeleteStoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStory>>, TError, DeleteStoryMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteStory>>, TError, DeleteStoryMutationVariables, TContext>;
export type DeleteStoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteStory>>>;
export type DeleteStoryMutationError = ErrorType<unknown>;
export type DeleteStoryMutationVariables = {
    storyId: number;
};
export declare const useDeleteStory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStory>>, TError, DeleteStoryMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteStory>>, TError, DeleteStoryMutationVariables, TContext>;
export declare const getMarkChatAsReadUrl: (chatId: number) => string;
/**
 * @summary Mark all messages in a chat as read
 */
export declare const markChatAsRead: (chatId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getMarkChatAsReadMutationKey: () => readonly ["markChatAsRead"];
export declare const getMarkChatAsReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markChatAsRead>>, TError, MarkChatAsReadMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markChatAsRead>>, TError, MarkChatAsReadMutationVariables, TContext>;
export type MarkChatAsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markChatAsRead>>>;
export type MarkChatAsReadMutationError = ErrorType<unknown>;
export type MarkChatAsReadMutationVariables = {
    chatId: number;
};
/**
* @summary Mark all messages in a chat as read
*/
export declare const useMarkChatAsRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markChatAsRead>>, TError, MarkChatAsReadMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markChatAsRead>>, TError, MarkChatAsReadMutationVariables, TContext>;
export declare const getGetPostsUrl: () => string;
/**
 * @summary Get feed posts
 */
export declare const getPosts: (options?: Parameters<typeof customFetch>[1]) => Promise<Post[]>;
export declare const getGetPostsQueryKey: () => readonly ["/api/posts"];
export declare const getGetPostsQueryOptions: <TData = Awaited<ReturnType<typeof getPosts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPosts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPosts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPostsQueryResult = NonNullable<Awaited<ReturnType<typeof getPosts>>>;
export type GetPostsQueryError = ErrorType<unknown>;
/**
 * @summary Get feed posts
 */
export declare function useGetPosts<TData = Awaited<ReturnType<typeof getPosts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPosts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePostUrl: () => string;
/**
 * @summary Create a new post
 */
export declare const createPost: (createPostBody: CreatePostBody, options?: Parameters<typeof customFetch>[1]) => Promise<Post>;
export declare const getCreatePostMutationKey: () => readonly ["createPost"];
export declare const getCreatePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPost>>, TError, CreatePostMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPost>>, TError, CreatePostMutationVariables, TContext>;
export type CreatePostMutationResult = NonNullable<Awaited<ReturnType<typeof createPost>>>;
export type CreatePostMutationBody = BodyType<CreatePostBody>;
export type CreatePostMutationError = ErrorType<unknown>;
export type CreatePostMutationVariables = {
    data: BodyType<CreatePostBody>;
};
/**
* @summary Create a new post
*/
export declare const useCreatePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPost>>, TError, CreatePostMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPost>>, TError, CreatePostMutationVariables, TContext>;
export declare const getDeletePostUrl: (postId: number) => string;
export declare const deletePost: (postId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeletePostMutationKey: () => readonly ["deletePost"];
export declare const getDeletePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePost>>, TError, DeletePostMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePost>>, TError, DeletePostMutationVariables, TContext>;
export type DeletePostMutationResult = NonNullable<Awaited<ReturnType<typeof deletePost>>>;
export type DeletePostMutationError = ErrorType<unknown>;
export type DeletePostMutationVariables = {
    postId: number;
};
export declare const useDeletePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePost>>, TError, DeletePostMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePost>>, TError, DeletePostMutationVariables, TContext>;
export declare const getLikePostUrl: (postId: number) => string;
export declare const likePost: (postId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Post>;
export declare const getLikePostMutationKey: () => readonly ["likePost"];
export declare const getLikePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof likePost>>, TError, LikePostMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof likePost>>, TError, LikePostMutationVariables, TContext>;
export type LikePostMutationResult = NonNullable<Awaited<ReturnType<typeof likePost>>>;
export type LikePostMutationError = ErrorType<unknown>;
export type LikePostMutationVariables = {
    postId: number;
};
export declare const useLikePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof likePost>>, TError, LikePostMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof likePost>>, TError, LikePostMutationVariables, TContext>;
export declare const getGetPostCommentsUrl: (postId: number) => string;
export declare const getPostComments: (postId: number, options?: Parameters<typeof customFetch>[1]) => Promise<PostComment[]>;
export declare const getGetPostCommentsQueryKey: (postId: number) => readonly [`/api/posts/${number}/comments`];
export declare const getGetPostCommentsQueryOptions: <TData = Awaited<ReturnType<typeof getPostComments>>, TError = ErrorType<unknown>>(postId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPostComments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPostComments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPostCommentsQueryResult = NonNullable<Awaited<ReturnType<typeof getPostComments>>>;
export type GetPostCommentsQueryError = ErrorType<unknown>;
export declare function useGetPostComments<TData = Awaited<ReturnType<typeof getPostComments>>, TError = ErrorType<unknown>>(postId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPostComments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePostCommentUrl: (postId: number) => string;
export declare const createPostComment: (postId: number, createPostCommentBody: CreatePostCommentBody, options?: Parameters<typeof customFetch>[1]) => Promise<PostComment>;
export declare const getCreatePostCommentMutationKey: () => readonly ["createPostComment"];
export declare const getCreatePostCommentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPostComment>>, TError, CreatePostCommentMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPostComment>>, TError, CreatePostCommentMutationVariables, TContext>;
export type CreatePostCommentMutationResult = NonNullable<Awaited<ReturnType<typeof createPostComment>>>;
export type CreatePostCommentMutationBody = BodyType<CreatePostCommentBody>;
export type CreatePostCommentMutationError = ErrorType<unknown>;
export type CreatePostCommentMutationVariables = {
    postId: number;
    data: BodyType<CreatePostCommentBody>;
};
export declare const useCreatePostComment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPostComment>>, TError, CreatePostCommentMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPostComment>>, TError, CreatePostCommentMutationVariables, TContext>;
export declare const getGetMyStatsUrl: () => string;
/**
 * @summary Get current user stats (messages sent, calls made, gifts)
 */
export declare const getMyStats: (options?: Parameters<typeof customFetch>[1]) => Promise<UserStats>;
export declare const getGetMyStatsQueryKey: () => readonly ["/api/stats/me"];
export declare const getGetMyStatsQueryOptions: <TData = Awaited<ReturnType<typeof getMyStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getMyStats>>>;
export type GetMyStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get current user stats (messages sent, calls made, gifts)
 */
export declare function useGetMyStats<TData = Awaited<ReturnType<typeof getMyStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSecurityQuestionUrl: (params: GetSecurityQuestionParams) => string;
/**
 * @summary Get security question for a username (for password reset)
 */
export declare const getSecurityQuestion: (params: GetSecurityQuestionParams, options?: Parameters<typeof customFetch>[1]) => Promise<SecurityQuestionResponse>;
export declare const getGetSecurityQuestionQueryKey: (params?: GetSecurityQuestionParams) => readonly ["/api/auth/security-question", ...GetSecurityQuestionParams[]];
export declare const getGetSecurityQuestionQueryOptions: <TData = Awaited<ReturnType<typeof getSecurityQuestion>>, TError = ErrorType<void>>(params: GetSecurityQuestionParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSecurityQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSecurityQuestion>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSecurityQuestionQueryResult = NonNullable<Awaited<ReturnType<typeof getSecurityQuestion>>>;
export type GetSecurityQuestionQueryError = ErrorType<void>;
/**
 * @summary Get security question for a username (for password reset)
 */
export declare function useGetSecurityQuestion<TData = Awaited<ReturnType<typeof getSecurityQuestion>>, TError = ErrorType<void>>(params: GetSecurityQuestionParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSecurityQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getResetPasswordUrl: () => string;
/**
 * @summary Reset password using security question answer
 */
export declare const resetPassword: (resetPasswordBody: ResetPasswordBody, options?: Parameters<typeof customFetch>[1]) => Promise<ResetPassword200>;
export declare const getResetPasswordMutationKey: () => readonly ["resetPassword"];
export declare const getResetPasswordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, ResetPasswordMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, ResetPasswordMutationVariables, TContext>;
export type ResetPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof resetPassword>>>;
export type ResetPasswordMutationBody = BodyType<ResetPasswordBody>;
export type ResetPasswordMutationError = ErrorType<unknown>;
export type ResetPasswordMutationVariables = {
    data: BodyType<ResetPasswordBody>;
};
/**
* @summary Reset password using security question answer
*/
export declare const useResetPassword: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, ResetPasswordMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resetPassword>>, TError, ResetPasswordMutationVariables, TContext>;
export declare const getSetSecurityQuestionUrl: () => string;
/**
 * @summary Set or update the security question for the current user
 */
export declare const setSecurityQuestion: (setSecurityQuestionBody: SetSecurityQuestionBody, options?: Parameters<typeof customFetch>[1]) => Promise<SetSecurityQuestion200>;
export declare const getSetSecurityQuestionMutationKey: () => readonly ["setSecurityQuestion"];
export declare const getSetSecurityQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, SetSecurityQuestionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, SetSecurityQuestionMutationVariables, TContext>;
export type SetSecurityQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof setSecurityQuestion>>>;
export type SetSecurityQuestionMutationBody = BodyType<SetSecurityQuestionBody>;
export type SetSecurityQuestionMutationError = ErrorType<unknown>;
export type SetSecurityQuestionMutationVariables = {
    data: BodyType<SetSecurityQuestionBody>;
};
/**
* @summary Set or update the security question for the current user
*/
export declare const useSetSecurityQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, SetSecurityQuestionMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, SetSecurityQuestionMutationVariables, TContext>;
export declare const getHasSecurityQuestionUrl: () => string;
/**
 * @summary Check if current user has a security question set
 */
export declare const hasSecurityQuestion: (options?: Parameters<typeof customFetch>[1]) => Promise<HasSecurityQuestion200>;
export declare const getHasSecurityQuestionQueryKey: () => readonly ["/api/users/me/security-question/check"];
export declare const getHasSecurityQuestionQueryOptions: <TData = Awaited<ReturnType<typeof hasSecurityQuestion>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof hasSecurityQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof hasSecurityQuestion>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HasSecurityQuestionQueryResult = NonNullable<Awaited<ReturnType<typeof hasSecurityQuestion>>>;
export type HasSecurityQuestionQueryError = ErrorType<unknown>;
/**
 * @summary Check if current user has a security question set
 */
export declare function useHasSecurityQuestion<TData = Awaited<ReturnType<typeof hasSecurityQuestion>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof hasSecurityQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map