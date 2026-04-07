#include "DocumentManager.h"
#include <stdexcept>

namespace CppEngine {
  
  DocumentManager& DocumentManager::getInstance() {
    static DocumentManager instance;
    return instance;
  }

  std::string DocumentManager::makeKey(
    const std::string& sessionKey,
    const std::string& fileId
  ) {
    return sessionKey + ":" + fileId;
  }

  DocumentState& DocumentManager::getState(
    const std::string& sessionKey,
    const std::string& fileId
  ) {
    auto sessionIt = _documents.find(sessionKey);
    if(sessionIt == _documents.end()) {
      throw std::runtime_error("DocumentManager::getState - session not found: " + sessionKey);    
    }
    auto fileIt = sessionIt->second.find(fileId);
    if(fileIt == sessionIt->second.end()) {
      throw std::runtime_error("DocumentManager::getState - file not found " + fileId + " in the session: " + sessionKey);    
    }
    return fileIt->second;
  }
  
  const DocumentState& DocumentManager::getState(
    const std::string& sessionKey,
    const std::string& fileId
  ) const {
    auto sessionIt = _documents.find(sessionKey);
    if(sessionIt == _documents.end()) {
      throw std::runtime_error("DocumentManager::getState - session not found: " + sessionKey);    
    }
    auto fileIt = sessionIt->second.find(fileId);
    if(fileIt == sessionIt->second.end()) {
      throw std::runtime_error("DocumentManager::getState - file not found " + fileId + " in the session: " + sessionKey);    
    }
    return fileIt->second;
  }

  void DocumentManager::openFile(
    const std::string& sessionKey,
    const std::string& fileId,
    const std::string& filepath,
    const std::string& content
  ) {
    auto& session = _documents[sessionKey];
    if(session.find(fileId) != session.end()) {
      return;
    }
    session.try_emplace(
      fileId,
      DocumentState {
        std::make_unique<PieceTable>(content),
        filepath,
        {},
        false,
        ""
      }
    );
  }

  void DocumentManager::closeFile(
    const std::string& sessionKey,
    const std::string& fileId
  ) {
    auto sessionIt = _documents.find(sessionKey);
    if(sessionIt == _documents.end()) {
      return;
    }
    sessionIt->second.erase(fileId);
    if(sessionIt->second.empty()) {
      _documents.erase(sessionKey);
    }
  }

  void DocumentManager::closeSession(
    const std::string& sessionKey
  ) {
    auto sessionIt = _documents.find(sessionKey);
    if(sessionIt == _documents.end()) {
      return;
    }
    _documents.erase(sessionKey);
  }

  void DocumentManager::insert(
    const std::string& sessionKey,
    const std::string& fileId,
    int offset,
    const std::string& text
  ) {
    getState(sessionKey, fileId).pieceTable->insert(offset, text);
  }

  void DocumentManager::remove(
    const std::string& sessionKey,
    const std::string& fileId,
    int offset,
    int length
  ) {
    getState(sessionKey, fileId).pieceTable->remove(offset, length);
  }

  void DocumentManager::setModifyingUser(
    const std::string& sessionKey,
    const std::string& fileId,
    const std::string& username
  ) {
    DocumentState& state = getState(sessionKey, fileId);
    state.isModifying = true;
    state.modifyingBy = username;
  }

  void DocumentManager::clearModifyingUser(
    const std::string& sessionKey,
    const std::string& fileId
  ) {
    DocumentState& state = getState(sessionKey, fileId);
    state.isModifying = false;
    state.modifyingBy = "";
  }

  std::string DocumentManager::getModifyingUser(
    const std::string& sessionKey,
    const std::string& fileId
  ) const {
    return getState(sessionKey, fileId).modifyingBy;
  }

  void DocumentManager::setViewer(
    const std::string& sessionKey,
    const std::string& fileId,
    const std::string& username
  ) {
    getState(sessionKey, fileId).activeViewers.insert(username);
  }

  void DocumentManager::clearViewer(
    const std::string& sessionKey,
    const std::string& fileId,
    const std::string& username
  ) {
    getState(sessionKey, fileId).activeViewers.erase(username);
  }


  bool DocumentManager::isFileModifying(
    const std::string& sessionKey,
    const std::string& fileId
  ) const {
    return getState(sessionKey, fileId).isModifying;
  }
  
  std::vector<Piece> DocumentManager::getPieces(
    const std::string& sessionKey,
    const std::string& fileId
  ) const {
    return getState(sessionKey, fileId).pieceTable->getPieces();
  }

  std::string DocumentManager::getBuffer(
    const std::string& sessionKey,
    const std::string& fileId
  ) const {
    return getState(sessionKey, fileId).pieceTable->getBuffer();
  }

  std::vector<FileStatus> DocumentManager::getAllFileState(
    const std::string& sessionKey
  ) const {
    auto sessionIt = _documents.find(sessionKey);
    if(sessionIt == _documents.end()) {
      return {};
    }

    std::vector<FileStatus> res;
    res.reserve(sessionIt->second.size());

    for(const auto& [fileId, state] : sessionIt->second) {
      res.push_back({
        state.filepath,
        state.activeViewers,
        state.isModifying,
        state.modifyingBy
      });
    }
    return res;
  }

  void DocumentManager::restoreFile(
    const std::string& sessionKey,
    const std::string& fileId,
    const std::string& filePath,
    const std::string& original,
    const std::string& add,
    const std::vector<Piece>& pieces
  ) {
    auto& session = _documents[sessionKey]; 
    session.erase(fileId);

    session.try_emplace(
      fileId,
      DocumentState {
        std::make_unique<PieceTable>(original, add, pieces),
        filePath,
        {},
        false,
        ""
      }
    );
  }
}