// Will act as the router (between Node.js and PieceTable)

#pragma once

#include "PieceTable.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <memory>

namespace CppEngine {

  // Represent the current state of the file
  
  struct DocumentState {
    std::unique_ptr<PieceTable> pieceTable;  // the text engine for this file
    std::string filePath;   // stored as "SESSION_KEY:src/foo/bar.ts"
    std::unordered_set<std::string> activeViewers; // will keep track who are watching that file
    bool isModifying;   // true if a user is actively typing
    std::string modifyingBy; // username of who is typing, "" if nobody

    DocumentState() = default;
    DocumentState(DocumentState&&) = default;
    DocumentState& operator=(DocumentState&&) = default;
  };

  // LightWight struct to broadcast all the active users
  struct FileStatus {
    std::string filePath;
    std::unordered_set<std::string> activeViewers;
    bool isModifying;
    std::string modifyingBy;  
  };

  class DocumentManager {
  public:

    /// @brief Get the singleton instance
    /// @return a reference to the one and only instance of the DocumentManager class
    static DocumentManager& getInstance(); // ensure that only one instance of the DocumentManager class exists throughout the entire program

    // no copy, no move
    DocumentManager(const DocumentManager&) = delete;
    DocumentManager& operator=(const DocumentManager&) = delete;

    /// @brief Open a file and initialize its PieceTable.
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    /// @param filePath    full path stored as "SESSION_KEY:src/foo/bar.ts"
    /// @param content     initial file content loaded from MongoDB
    void openFile(
      const std::string& sessionKey,
      const std::string& fileId,
      const std::string& filePath,
      const std::string& content
    );

    /// @brief Close a file and free its PieceTable memory.
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    void closeFile(
      const std::string& sessionKey,
      const std::string& fileId    
    );

    /// @brief Close all the files under a session and clear the memory
    /// @param sessionKey the permanent session identifier
    void closeSession(const std::string& sessionKey);

    /// @brief Insert text at an absolute offset.
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    /// @param offset      rangeOffset from VS Code
    /// @param text        change.text from VS Code
    void insert(
      const std::string& sessionKey,
      const std::string& fileId,
      int offset,
      const std::string& text    
    );

    /// @brief Delete characters at an absolute offset.
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    /// @param offset      rangeOffset from VS Code
    /// @param length      rangeLength from VS Code
    void remove(
      const std::string& sessionKey,
      const std::string& fileId,
      int offset,
      int length    
    );

    /// @brief Mark a file as being actively modified by a user.
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    /// @param username    the user who started typing
    void setModifyingUser(
      const std::string& sessionKey,
      const std::string& fileId,
      const std::string& username    
    );

    /// @brief Clear the active user and reset the save flag.
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    void clearModifyingUser(
      const std::string& sessionKey,
      const std::string& fileId
    );

    /// @brief Returns the username currently modifying the file.
    /// @return activeUser string, "" if nobody is working
    std::string getModifyingUser(
      const std::string& sessionKey,
      const std::string& fileId
    ) const;

    /// @brief Will set the active viewer
    void setViewer(
      const std::string& sessionKey,
      const std::string& fileId,
      const std::string& username
    );

    /// @brief Will clear the active viewer
    void clearViewer(
      const std::string& sessionKey,
      const std::string& fileId,
      const std::string& username
    );

    /// @brief Returns true if a user is actively modifying the file.
    bool isFileModifying(
      const std::string& sessionKey,
      const std::string& fileId
    ) const; 

    /// @brief Return the piece list for Redis snapshot.
    /// @note  Called every 5-6s by Node.js.
    std::vector<Piece> getPieces(
      const std::string& sessionKey,
      const std::string& fileId
    ) const;

    /// @brief Reconstruct and return the full file content.
    /// @note  Called every 10s by Node.js for MongoDB save.
    std::string getBuffer(
      const std::string& sessionKey,
      const std::string& fileId
    ) const;

    /// @brief Return the status of every file in a session.
    std::vector<FileStatus> getAllFileState(
      const std::string& sessionKey
    ) const;

    /// @brief             Rebuild a file's PieceTable from a Redis snapshot.
    /// @note              Will be called for the crash recovery
    /// @param sessionKey  the permanent session identifier
    /// @param fileId      short generated ID for this file
    /// @param filePath    full path stored as "SESSION_KEY:src/foo/bar.ts"
    /// @param original    the original buffer at time of snapshot
    /// @param add         the add buffer at time of snapshot
    /// @param pieces      in-order piece array from Redis
    void restoreFile(
      const std::string&        sessionKey,
      const std::string&        fileId,
      const std::string&        filePath,
      const std::string&        original,
      const std::string&        add,
      const std::vector<Piece>& pieces
    );

  private:
    /// @brief  Private constructor — singleton
    DocumentManager() = default;

    /// @brief Find a DocumentState or throw if not found.
    DocumentState& getState(
      const std::string& sessionKey,
      const std::string& fileId    
    );

    /// @brief Const overload of getState.
    const DocumentState& getState(
      const std::string& sessionKey,
      const std::string& fileId
    ) const;

    /// @brief Build internal lookup key from sessionKey + fileId
    static std::string makeKey(
      const std::string& sessionKey,
      const std::string& fileId
    );

    // SESSION_KEY -> file_id -> DocumentState
    std::unordered_map<std::string, std::unordered_map<std::string, DocumentState>> _documents;
  };
};