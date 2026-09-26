import Foundation

struct ChatChannel: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let companyId: String
    var name: String
    var channelType: String
    var projectId: String?
    var isPrivate: Bool
    var createdBy: String
}

struct ChatMessage: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let channelId: String
    let userId: String
    var content: String?
    var messageType: String?
    var createdAt: Date
    var editedAt: Date?
}

struct NewChatChannel: Encodable, Sendable {
    let companyId: String
    let name: String
    let channelType = "project"
    let projectId: String
    let isPrivate = false
    let createdBy: String

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case name
        case channelType = "channel_type"
        case projectId = "project_id"
        case isPrivate = "is_private"
        case createdBy = "created_by"
    }
}

struct NewChannelMember: Encodable, Sendable {
    let channelId: String
    let companyId: String
    let userId: String
    let role: String

    enum CodingKeys: String, CodingKey {
        case channelId = "channel_id"
        case companyId = "company_id"
        case userId = "user_id"
        case role
    }
}

struct NewChatMessage: Encodable, Sendable {
    let channelId: String
    let companyId: String
    let userId: String
    let content: String
    let messageType = "text"

    enum CodingKeys: String, CodingKey {
        case channelId = "channel_id"
        case companyId = "company_id"
        case userId = "user_id"
        case content
        case messageType = "message_type"
    }
}

/// A row from `company_member_names()`.
struct MemberName: Decodable, Sendable {
    let userId: String
    let displayName: String?
}
