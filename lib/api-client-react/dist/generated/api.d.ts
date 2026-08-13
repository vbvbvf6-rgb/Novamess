import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AddContactBody, AddMemberBody, AddReactionBody, Call, Chat, ChatMember, CreateChatBody, CreatePostBody, CreatePostCommentBody, CreateStoryBody, EditMessageBody, GetMessagesParams, GetSecurityQuestionParams, Gift, GiftItem, HasSecurityQuestion200, HealthStatus, InitiateCallBody, Message, Post, PostComment, Reaction, ResetPassword200, ResetPasswordBody, SearchUsersParams, SecurityQuestionResponse, SendGiftBody, SendMessageBody, SetSecurityQuestion200, SetSecurityQuestionBody, Story, StoryGroup, UpdateCallBody, UpdateChatBody, UpdateUserBody, User, UserStats } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
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
/**
 * @summary Get current user
 */
export declare const getGetMeUrl: () => string;
export declare const getMe: (options?: RequestInit) => Promise<User>;
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
/**
 * @summary Update current user profile
 */
export declare const getUpdateMeUrl: () => string;
export declare const updateMe: (updateUserBody: UpdateUserBody, options?: RequestInit) => Promise<User>;
export declare const getUpdateMeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, {
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, {
    data: BodyType<UpdateUserBody>;
}, TContext>;
export type UpdateMeMutationResult = NonNullable<Awaited<ReturnType<typeof updateMe>>>;
export type UpdateMeMutationBody = BodyType<UpdateUserBody>;
export type UpdateMeMutationError = ErrorType<unknown>;
/**
 * @summary Update current user profile
 */
export declare const useUpdateMe: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, {
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMe>>, TError, {
    data: BodyType<UpdateUserBody>;
}, TContext>;
/**
 * @summary Search users by username or name
 */
export declare const getSearchUsersUrl: (params: SearchUsersParams) => string;
export declare const searchUsers: (params: SearchUsersParams, options?: RequestInit) => Promise<User[]>;
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
export declare const getUserById: (userId: number, options?: RequestInit) => Promise<User>;
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
/**
 * @summary Get user contacts
 */
export declare const getGetContactsUrl: () => string;
export declare const getContacts: (options?: RequestInit) => Promise<User[]>;
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
/**
 * @summary Add a contact
 */
export declare const getAddContactUrl: () => string;
export declare const addContact: (addContactBody: AddContactBody, options?: RequestInit) => Promise<User>;
export declare const getAddContactMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addContact>>, TError, {
        data: BodyType<AddContactBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addContact>>, TError, {
    data: BodyType<AddContactBody>;
}, TContext>;
export type AddContactMutationResult = NonNullable<Awaited<ReturnType<typeof addContact>>>;
export type AddContactMutationBody = BodyType<AddContactBody>;
export type AddContactMutationError = ErrorType<unknown>;
/**
 * @summary Add a contact
 */
export declare const useAddContact: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addContact>>, TError, {
        data: BodyType<AddContactBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addContact>>, TError, {
    data: BodyType<AddContactBody>;
}, TContext>;
export declare const getRemoveContactUrl: (contactId: number) => string;
export declare const removeContact: (contactId: number, options?: RequestInit) => Promise<void>;
export declare const getRemoveContactMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeContact>>, TError, {
        contactId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeContact>>, TError, {
    contactId: number;
}, TContext>;
export type RemoveContactMutationResult = NonNullable<Awaited<ReturnType<typeof removeContact>>>;
export type RemoveContactMutationError = ErrorType<unknown>;
export declare const useRemoveContact: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeContact>>, TError, {
        contactId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeContact>>, TError, {
    contactId: number;
}, TContext>;
/**
 * @summary Get all chats for current user
 */
export declare const getGetChatsUrl: () => string;
export declare const getChats: (options?: RequestInit) => Promise<Chat[]>;
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
/**
 * @summary Create a new chat or group
 */
export declare const getCreateChatUrl: () => string;
export declare const createChat: (createChatBody: CreateChatBody, options?: RequestInit) => Promise<Chat>;
export declare const getCreateChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createChat>>, TError, {
        data: BodyType<CreateChatBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createChat>>, TError, {
    data: BodyType<CreateChatBody>;
}, TContext>;
export type CreateChatMutationResult = NonNullable<Awaited<ReturnType<typeof createChat>>>;
export type CreateChatMutationBody = BodyType<CreateChatBody>;
export type CreateChatMutationError = ErrorType<unknown>;
/**
 * @summary Create a new chat or group
 */
export declare const useCreateChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createChat>>, TError, {
        data: BodyType<CreateChatBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createChat>>, TError, {
    data: BodyType<CreateChatBody>;
}, TContext>;
export declare const getGetChatByIdUrl: (chatId: number) => string;
export declare const getChatById: (chatId: number, options?: RequestInit) => Promise<Chat>;
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
export declare const updateChat: (chatId: number, updateChatBody: UpdateChatBody, options?: RequestInit) => Promise<Chat>;
export declare const getUpdateChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateChat>>, TError, {
        chatId: number;
        data: BodyType<UpdateChatBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateChat>>, TError, {
    chatId: number;
    data: BodyType<UpdateChatBody>;
}, TContext>;
export type UpdateChatMutationResult = NonNullable<Awaited<ReturnType<typeof updateChat>>>;
export type UpdateChatMutationBody = BodyType<UpdateChatBody>;
export type UpdateChatMutationError = ErrorType<unknown>;
export declare const useUpdateChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateChat>>, TError, {
        chatId: number;
        data: BodyType<UpdateChatBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateChat>>, TError, {
    chatId: number;
    data: BodyType<UpdateChatBody>;
}, TContext>;
export declare const getDeleteChatUrl: (chatId: number) => string;
export declare const deleteChat: (chatId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteChat>>, TError, {
        chatId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteChat>>, TError, {
    chatId: number;
}, TContext>;
export type DeleteChatMutationResult = NonNullable<Awaited<ReturnType<typeof deleteChat>>>;
export type DeleteChatMutationError = ErrorType<unknown>;
export declare const useDeleteChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteChat>>, TError, {
        chatId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteChat>>, TError, {
    chatId: number;
}, TContext>;
export declare const getGetChatMembersUrl: (chatId: number) => string;
export declare const getChatMembers: (chatId: number, options?: RequestInit) => Promise<ChatMember[]>;
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
export declare const addChatMember: (chatId: number, addMemberBody: AddMemberBody, options?: RequestInit) => Promise<ChatMember>;
export declare const getAddChatMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addChatMember>>, TError, {
        chatId: number;
        data: BodyType<AddMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addChatMember>>, TError, {
    chatId: number;
    data: BodyType<AddMemberBody>;
}, TContext>;
export type AddChatMemberMutationResult = NonNullable<Awaited<ReturnType<typeof addChatMember>>>;
export type AddChatMemberMutationBody = BodyType<AddMemberBody>;
export type AddChatMemberMutationError = ErrorType<unknown>;
export declare const useAddChatMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addChatMember>>, TError, {
        chatId: number;
        data: BodyType<AddMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addChatMember>>, TError, {
    chatId: number;
    data: BodyType<AddMemberBody>;
}, TContext>;
export declare const getRemoveChatMemberUrl: (chatId: number, memberId: number) => string;
export declare const removeChatMember: (chatId: number, memberId: number, options?: RequestInit) => Promise<void>;
export declare const getRemoveChatMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeChatMember>>, TError, {
        chatId: number;
        memberId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeChatMember>>, TError, {
    chatId: number;
    memberId: number;
}, TContext>;
export type RemoveChatMemberMutationResult = NonNullable<Awaited<ReturnType<typeof removeChatMember>>>;
export type RemoveChatMemberMutationError = ErrorType<unknown>;
export declare const useRemoveChatMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeChatMember>>, TError, {
        chatId: number;
        memberId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeChatMember>>, TError, {
    chatId: number;
    memberId: number;
}, TContext>;
export declare const getPinChatUrl: (chatId: number) => string;
export declare const pinChat: (chatId: number, options?: RequestInit) => Promise<Chat>;
export declare const getPinChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof pinChat>>, TError, {
        chatId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof pinChat>>, TError, {
    chatId: number;
}, TContext>;
export type PinChatMutationResult = NonNullable<Awaited<ReturnType<typeof pinChat>>>;
export type PinChatMutationError = ErrorType<unknown>;
export declare const usePinChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof pinChat>>, TError, {
        chatId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof pinChat>>, TError, {
    chatId: number;
}, TContext>;
/**
 * @summary Get messages for a chat
 */
export declare const getGetMessagesUrl: (params: GetMessagesParams) => string;
export declare const getMessages: (params: GetMessagesParams, options?: RequestInit) => Promise<Message[]>;
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
/**
 * @summary Send a message
 */
export declare const getSendMessageUrl: () => string;
export declare const sendMessage: (sendMessageBody: SendMessageBody, options?: RequestInit) => Promise<Message>;
export declare const getSendMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        data: BodyType<SendMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
    data: BodyType<SendMessageBody>;
}, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = BodyType<SendMessageBody>;
export type SendMessageMutationError = ErrorType<unknown>;
/**
 * @summary Send a message
 */
export declare const useSendMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        data: BodyType<SendMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, {
    data: BodyType<SendMessageBody>;
}, TContext>;
export declare const getEditMessageUrl: (messageId: number) => string;
export declare const editMessage: (messageId: number, editMessageBody: EditMessageBody, options?: RequestInit) => Promise<Message>;
export declare const getEditMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, {
        messageId: number;
        data: BodyType<EditMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, {
    messageId: number;
    data: BodyType<EditMessageBody>;
}, TContext>;
export type EditMessageMutationResult = NonNullable<Awaited<ReturnType<typeof editMessage>>>;
export type EditMessageMutationBody = BodyType<EditMessageBody>;
export type EditMessageMutationError = ErrorType<unknown>;
export declare const useEditMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, {
        messageId: number;
        data: BodyType<EditMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof editMessage>>, TError, {
    messageId: number;
    data: BodyType<EditMessageBody>;
}, TContext>;
export declare const getDeleteMessageUrl: (messageId: number) => string;
export declare const deleteMessage: (messageId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, {
        messageId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, {
    messageId: number;
}, TContext>;
export type DeleteMessageMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMessage>>>;
export type DeleteMessageMutationError = ErrorType<unknown>;
export declare const useDeleteMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, {
        messageId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMessage>>, TError, {
    messageId: number;
}, TContext>;
export declare const getAddReactionUrl: (messageId: number) => string;
export declare const addReaction: (messageId: number, addReactionBody: AddReactionBody, options?: RequestInit) => Promise<Reaction>;
export declare const getAddReactionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addReaction>>, TError, {
        messageId: number;
        data: BodyType<AddReactionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addReaction>>, TError, {
    messageId: number;
    data: BodyType<AddReactionBody>;
}, TContext>;
export type AddReactionMutationResult = NonNullable<Awaited<ReturnType<typeof addReaction>>>;
export type AddReactionMutationBody = BodyType<AddReactionBody>;
export type AddReactionMutationError = ErrorType<unknown>;
export declare const useAddReaction: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addReaction>>, TError, {
        messageId: number;
        data: BodyType<AddReactionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addReaction>>, TError, {
    messageId: number;
    data: BodyType<AddReactionBody>;
}, TContext>;
export declare const getRemoveReactionUrl: (messageId: number) => string;
export declare const removeReaction: (messageId: number, addReactionBody: AddReactionBody, options?: RequestInit) => Promise<void>;
export declare const getRemoveReactionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeReaction>>, TError, {
        messageId: number;
        data: BodyType<AddReactionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeReaction>>, TError, {
    messageId: number;
    data: BodyType<AddReactionBody>;
}, TContext>;
export type RemoveReactionMutationResult = NonNullable<Awaited<ReturnType<typeof removeReaction>>>;
export type RemoveReactionMutationBody = BodyType<AddReactionBody>;
export type RemoveReactionMutationError = ErrorType<unknown>;
export declare const useRemoveReaction: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeReaction>>, TError, {
        messageId: number;
        data: BodyType<AddReactionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeReaction>>, TError, {
    messageId: number;
    data: BodyType<AddReactionBody>;
}, TContext>;
/**
 * @summary Get call history
 */
export declare const getGetCallHistoryUrl: () => string;
export declare const getCallHistory: (options?: RequestInit) => Promise<Call[]>;
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
/**
 * @summary Initiate a call
 */
export declare const getInitiateCallUrl: () => string;
export declare const initiateCall: (initiateCallBody: InitiateCallBody, options?: RequestInit) => Promise<Call>;
export declare const getInitiateCallMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiateCall>>, TError, {
        data: BodyType<InitiateCallBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof initiateCall>>, TError, {
    data: BodyType<InitiateCallBody>;
}, TContext>;
export type InitiateCallMutationResult = NonNullable<Awaited<ReturnType<typeof initiateCall>>>;
export type InitiateCallMutationBody = BodyType<InitiateCallBody>;
export type InitiateCallMutationError = ErrorType<unknown>;
/**
 * @summary Initiate a call
 */
export declare const useInitiateCall: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiateCall>>, TError, {
        data: BodyType<InitiateCallBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof initiateCall>>, TError, {
    data: BodyType<InitiateCallBody>;
}, TContext>;
export declare const getGetCallByIdUrl: (callId: number) => string;
export declare const getCallById: (callId: number, options?: RequestInit) => Promise<Call>;
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
export declare const updateCallStatus: (callId: number, updateCallBody: UpdateCallBody, options?: RequestInit) => Promise<Call>;
export declare const getUpdateCallStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCallStatus>>, TError, {
        callId: number;
        data: BodyType<UpdateCallBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCallStatus>>, TError, {
    callId: number;
    data: BodyType<UpdateCallBody>;
}, TContext>;
export type UpdateCallStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateCallStatus>>>;
export type UpdateCallStatusMutationBody = BodyType<UpdateCallBody>;
export type UpdateCallStatusMutationError = ErrorType<unknown>;
export declare const useUpdateCallStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCallStatus>>, TError, {
        callId: number;
        data: BodyType<UpdateCallBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCallStatus>>, TError, {
    callId: number;
    data: BodyType<UpdateCallBody>;
}, TContext>;
/**
 * @summary Get available gift catalog
 */
export declare const getGetGiftCatalogUrl: () => string;
export declare const getGiftCatalog: (options?: RequestInit) => Promise<GiftItem[]>;
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
/**
 * @summary Get gifts sent by current user
 */
export declare const getGetSentGiftsUrl: () => string;
export declare const getSentGifts: (options?: RequestInit) => Promise<Gift[]>;
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
/**
 * @summary Get gifts received by current user
 */
export declare const getGetReceivedGiftsUrl: () => string;
export declare const getReceivedGifts: (options?: RequestInit) => Promise<Gift[]>;
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
/**
 * @summary Send a gift to a user
 */
export declare const getSendGiftUrl: () => string;
export declare const sendGift: (sendGiftBody: SendGiftBody, options?: RequestInit) => Promise<Gift>;
export declare const getSendGiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendGift>>, TError, {
        data: BodyType<SendGiftBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendGift>>, TError, {
    data: BodyType<SendGiftBody>;
}, TContext>;
export type SendGiftMutationResult = NonNullable<Awaited<ReturnType<typeof sendGift>>>;
export type SendGiftMutationBody = BodyType<SendGiftBody>;
export type SendGiftMutationError = ErrorType<unknown>;
/**
 * @summary Send a gift to a user
 */
export declare const useSendGift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendGift>>, TError, {
        data: BodyType<SendGiftBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendGift>>, TError, {
    data: BodyType<SendGiftBody>;
}, TContext>;
/**
 * @summary Get stories from contacts
 */
export declare const getGetStoriesUrl: () => string;
export declare const getStories: (options?: RequestInit) => Promise<StoryGroup[]>;
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
/**
 * @summary Create a story
 */
export declare const getCreateStoryUrl: () => string;
export declare const createStory: (createStoryBody: CreateStoryBody, options?: RequestInit) => Promise<Story>;
export declare const getCreateStoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStory>>, TError, {
        data: BodyType<CreateStoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createStory>>, TError, {
    data: BodyType<CreateStoryBody>;
}, TContext>;
export type CreateStoryMutationResult = NonNullable<Awaited<ReturnType<typeof createStory>>>;
export type CreateStoryMutationBody = BodyType<CreateStoryBody>;
export type CreateStoryMutationError = ErrorType<unknown>;
/**
 * @summary Create a story
 */
export declare const useCreateStory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStory>>, TError, {
        data: BodyType<CreateStoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createStory>>, TError, {
    data: BodyType<CreateStoryBody>;
}, TContext>;
export declare const getDeleteStoryUrl: (storyId: number) => string;
export declare const deleteStory: (storyId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteStoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStory>>, TError, {
        storyId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteStory>>, TError, {
    storyId: number;
}, TContext>;
export type DeleteStoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteStory>>>;
export type DeleteStoryMutationError = ErrorType<unknown>;
export declare const useDeleteStory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStory>>, TError, {
        storyId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteStory>>, TError, {
    storyId: number;
}, TContext>;
/**
 * @summary Mark all messages in a chat as read
 */
export declare const getMarkChatAsReadUrl: (chatId: number) => string;
export declare const markChatAsRead: (chatId: number, options?: RequestInit) => Promise<void>;
export declare const getMarkChatAsReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markChatAsRead>>, TError, {
        chatId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markChatAsRead>>, TError, {
    chatId: number;
}, TContext>;
export type MarkChatAsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markChatAsRead>>>;
export type MarkChatAsReadMutationError = ErrorType<unknown>;
/**
 * @summary Mark all messages in a chat as read
 */
export declare const useMarkChatAsRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markChatAsRead>>, TError, {
        chatId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markChatAsRead>>, TError, {
    chatId: number;
}, TContext>;
/**
 * @summary Get feed posts
 */
export declare const getGetPostsUrl: () => string;
export declare const getPosts: (options?: RequestInit) => Promise<Post[]>;
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
/**
 * @summary Create a new post
 */
export declare const getCreatePostUrl: () => string;
export declare const createPost: (createPostBody: CreatePostBody, options?: RequestInit) => Promise<Post>;
export declare const getCreatePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPost>>, TError, {
        data: BodyType<CreatePostBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPost>>, TError, {
    data: BodyType<CreatePostBody>;
}, TContext>;
export type CreatePostMutationResult = NonNullable<Awaited<ReturnType<typeof createPost>>>;
export type CreatePostMutationBody = BodyType<CreatePostBody>;
export type CreatePostMutationError = ErrorType<unknown>;
/**
 * @summary Create a new post
 */
export declare const useCreatePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPost>>, TError, {
        data: BodyType<CreatePostBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPost>>, TError, {
    data: BodyType<CreatePostBody>;
}, TContext>;
export declare const getDeletePostUrl: (postId: number) => string;
export declare const deletePost: (postId: number, options?: RequestInit) => Promise<void>;
export declare const getDeletePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePost>>, TError, {
        postId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePost>>, TError, {
    postId: number;
}, TContext>;
export type DeletePostMutationResult = NonNullable<Awaited<ReturnType<typeof deletePost>>>;
export type DeletePostMutationError = ErrorType<unknown>;
export declare const useDeletePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePost>>, TError, {
        postId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePost>>, TError, {
    postId: number;
}, TContext>;
export declare const getLikePostUrl: (postId: number) => string;
export declare const likePost: (postId: number, options?: RequestInit) => Promise<Post>;
export declare const getLikePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof likePost>>, TError, {
        postId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof likePost>>, TError, {
    postId: number;
}, TContext>;
export type LikePostMutationResult = NonNullable<Awaited<ReturnType<typeof likePost>>>;
export type LikePostMutationError = ErrorType<unknown>;
export declare const useLikePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof likePost>>, TError, {
        postId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof likePost>>, TError, {
    postId: number;
}, TContext>;
export declare const getGetPostCommentsUrl: (postId: number) => string;
export declare const getPostComments: (postId: number, options?: RequestInit) => Promise<PostComment[]>;
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
export declare const createPostComment: (postId: number, createPostCommentBody: CreatePostCommentBody, options?: RequestInit) => Promise<PostComment>;
export declare const getCreatePostCommentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPostComment>>, TError, {
        postId: number;
        data: BodyType<CreatePostCommentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPostComment>>, TError, {
    postId: number;
    data: BodyType<CreatePostCommentBody>;
}, TContext>;
export type CreatePostCommentMutationResult = NonNullable<Awaited<ReturnType<typeof createPostComment>>>;
export type CreatePostCommentMutationBody = BodyType<CreatePostCommentBody>;
export type CreatePostCommentMutationError = ErrorType<unknown>;
export declare const useCreatePostComment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPostComment>>, TError, {
        postId: number;
        data: BodyType<CreatePostCommentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPostComment>>, TError, {
    postId: number;
    data: BodyType<CreatePostCommentBody>;
}, TContext>;
/**
 * @summary Get current user stats (messages sent, calls made, gifts)
 */
export declare const getGetMyStatsUrl: () => string;
export declare const getMyStats: (options?: RequestInit) => Promise<UserStats>;
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
/**
 * @summary Get security question for a username (for password reset)
 */
export declare const getGetSecurityQuestionUrl: (params: GetSecurityQuestionParams) => string;
export declare const getSecurityQuestion: (params: GetSecurityQuestionParams, options?: RequestInit) => Promise<SecurityQuestionResponse>;
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
/**
 * @summary Reset password using security question answer
 */
export declare const getResetPasswordUrl: () => string;
export declare const resetPassword: (resetPasswordBody: ResetPasswordBody, options?: RequestInit) => Promise<ResetPassword200>;
export declare const getResetPasswordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
        data: BodyType<ResetPasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
    data: BodyType<ResetPasswordBody>;
}, TContext>;
export type ResetPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof resetPassword>>>;
export type ResetPasswordMutationBody = BodyType<ResetPasswordBody>;
export type ResetPasswordMutationError = ErrorType<unknown>;
/**
 * @summary Reset password using security question answer
 */
export declare const useResetPassword: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
        data: BodyType<ResetPasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resetPassword>>, TError, {
    data: BodyType<ResetPasswordBody>;
}, TContext>;
/**
 * @summary Set or update the security question for the current user
 */
export declare const getSetSecurityQuestionUrl: () => string;
export declare const setSecurityQuestion: (setSecurityQuestionBody: SetSecurityQuestionBody, options?: RequestInit) => Promise<SetSecurityQuestion200>;
export declare const getSetSecurityQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, {
        data: BodyType<SetSecurityQuestionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, {
    data: BodyType<SetSecurityQuestionBody>;
}, TContext>;
export type SetSecurityQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof setSecurityQuestion>>>;
export type SetSecurityQuestionMutationBody = BodyType<SetSecurityQuestionBody>;
export type SetSecurityQuestionMutationError = ErrorType<unknown>;
/**
 * @summary Set or update the security question for the current user
 */
export declare const useSetSecurityQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, {
        data: BodyType<SetSecurityQuestionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setSecurityQuestion>>, TError, {
    data: BodyType<SetSecurityQuestionBody>;
}, TContext>;
/**
 * @summary Check if current user has a security question set
 */
export declare const getHasSecurityQuestionUrl: () => string;
export declare const hasSecurityQuestion: (options?: RequestInit) => Promise<HasSecurityQuestion200>;
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