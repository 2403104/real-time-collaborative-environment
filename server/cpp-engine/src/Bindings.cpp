#include <napi.h> // gateway that allows C++ code to talk to Node.js.
#include "DocumentManager.h"
#include <string>
#include <vector>

namespace CppEngine {

  Napi::Value OpenFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env(); // Napi::Env is an opaque handle representing the state of the Node.js engine at that exact moment.
    
    if(info.Length() < 4) {
      Napi::TypeError::New(env, "Open file requires 4 arguments.")
        .ThrowAsJavaScriptException();
        
      return env.Null();
    }
    // Apply Security check 

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    std::string filePath = info[2].As<Napi::String>().Utf8Value();
    std::string content = info[3].As<Napi::String>().Utf8Value();
    
    try {
      DocumentManager::getInstance().openFile(
        sessionKey, fileId, filePath, content
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }
    
    return env.Undefined();
  }

  Napi::Value CloseFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if(info.Length() < 2) {
      Napi::TypeError::New(env, "closeFile requires 2 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    
    try {
      DocumentManager::getInstance().closeFile(
        sessionKey, fileId
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }
    
    return env.Undefined();
  }

  Napi::Value CloseSession(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if(info.Length() < 1) {
      Napi::TypeError::New(env, "Close session requires 1 argument")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    
    try {
      DocumentManager::getInstance().closeSession(
        sessionKey
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }
    
    return env.Undefined();
  }

  Napi::Value Insert(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 4) {
      Napi::TypeError::New(env, "insert requires 4 arguments")
          .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    int offset = info[2].As<Napi::Number>().Int32Value();
    std::string text = info[3].As<Napi::String>().Utf8Value();

    try {
      DocumentManager::getInstance().insert(
        sessionKey, fileId, offset, text
      );
    } catch (const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }

    return env.Undefined();
  }

  Napi::Value Remove(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 4) {
      Napi::TypeError::New(env, "remove requires 4 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    int offset = info[2].As<Napi::Number>().Int32Value();
    int length = info[3].As<Napi::Number>().Int32Value();

    try {
      DocumentManager::getInstance().remove(
        sessionKey, fileId, offset, length
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }

    return env.Undefined();
  }

  // --- MODIFYING USER (Typing) ---

  Napi::Value SetModifyingUser(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3) {
      Napi::TypeError::New(env, "setModifyingUser requires 3 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    std::string username = info[2].As<Napi::String>().Utf8Value();

    try {
      DocumentManager::getInstance().setModifyingUser(
        sessionKey, fileId, username
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }

    return env.Undefined();
  }

  Napi::Value ClearModifyingUser(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
      Napi::TypeError::New(env, "clearModifyingUser requires 2 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();

    try {
      DocumentManager::getInstance().clearModifyingUser(
        sessionKey, fileId
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }

    return env.Undefined();
  }

  Napi::Value GetModifyingUser(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
      Napi::TypeError::New(env, "getModifyingUser requires 2 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();

    try {
      std::string username = DocumentManager::getInstance().getModifyingUser(
        sessionKey, fileId
      );

      return Napi::String::New(env, username);

    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    return env.Undefined();
  }


  Napi::Value SetViewer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3) {
      Napi::TypeError::New(env, "setViewer requires 3 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    std::string username = info[2].As<Napi::String>().Utf8Value();

    try {
      DocumentManager::getInstance().setViewer(
        sessionKey, fileId, username
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }

    return env.Undefined();
  }

  Napi::Value ClearViewer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3) {
      Napi::TypeError::New(env, "clearViewer requires 3 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    std::string username = info[2].As<Napi::String>().Utf8Value();

    try {
      DocumentManager::getInstance().clearViewer(
        sessionKey, fileId, username
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }

    return env.Undefined();
  }

  Napi::Value GetBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
      Napi::TypeError::New(env, "getBuffer requires 2 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();

    try {
      std::string buffer = DocumentManager::getInstance().getBuffer(
        sessionKey, fileId
      );

      return Napi::String::New(env, buffer);
      
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    return env.Undefined();
  }

  Napi::Value GetPieces(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
      Napi::TypeError::New(env, "getPieces requires 2 arguments.")
        .ThrowAsJavaScriptException(); 
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();

    try {
      std::vector<Piece> pieces = DocumentManager::getInstance().getPieces(
        sessionKey, fileId
      );

      Napi::Array jsArray = Napi::Array::New(env, pieces.size()); // [{}]*size

      for(size_t i = 0; i < pieces.size(); i++){
        const Piece& p = pieces[i];
        Napi::Object jsObject = Napi::Object::New(env); // {}
        jsObject.Set(
          "bufferType",
          Napi::Number::New(
            env, 
            p.bufferType == BufferType::ORIGINAL ? 0 : 1
          )
        );
        jsObject.Set(
          "start",
          Napi::Number::New(env, p.start)
        );
        jsObject.Set(
          "length",
          Napi::Number::New(env, p.length)
        );
        jsArray.Set(static_cast<uint32_t>(i), jsObject);
      }

      return jsArray;

    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException(); 
      return env.Null();
    }

    return env.Undefined();
  }

  Napi::Value GetAllFileStates(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
      Napi::TypeError::New(env, "getAllFileStates requires 1 argument")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();

    try{
      std::vector<FileStatus> states = DocumentManager::getInstance().getAllFileState(
        sessionKey
      );

      Napi::Array jsArray = Napi::Array::New(env, states.size());

      for(size_t i = 0; i < states.size(); i++) {
        const FileStatus& s = states[i];

        Napi::Object jsObject = Napi::Object::New(env);

        jsObject.Set(
          "filePath",
          Napi::String::New(env, s.filePath)
        );
        jsObject.Set(
          "isModifying",
          Napi::Boolean::New(env, s.isModifying)
        );
        jsObject.Set(
          "modifyingBy",
          Napi::String::New(env, s.modifyingBy)
        );

        // Convert the C++ unordered_set into a JS Array
        Napi::Array viewersArray = Napi::Array::New(env, s.activeViewers.size());
        uint32_t vIndex = 0;
        for (const std::string& viewer : s.activeViewers) {
          viewersArray.Set(vIndex++, Napi::String::New(env, viewer));
        }
        jsObject.Set("viewers", viewersArray);

        jsArray.Set(static_cast<uint32_t>(i), jsObject);
      }

      return jsArray;

    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
      return env.Null();
    }
    return env.Undefined();
  }

  Napi::Value RestoreFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 6) {
      Napi::TypeError::New(env, "restoreFile requires 6 arguments")
        .ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string sessionKey = info[0].As<Napi::String>().Utf8Value();
    std::string fileId = info[1].As<Napi::String>().Utf8Value();
    std::string filePath = info[2].As<Napi::String>().Utf8Value();
    std::string original = info[3].As<Napi::String>().Utf8Value();
    std::string add = info[4].As<Napi::String>().Utf8Value();
    std::vector<Piece> pieces;

    Napi::Array jsArray = info[5].As<Napi::Array>();
    pieces.reserve(jsArray.Length());

    for(uint32_t i = 0; i < jsArray.Length(); i++) {
      Napi::Object jsObject = jsArray.Get(i).As<Napi::Object>();
      pieces.push_back({
        BufferType(jsObject.Get("bufferType").As<Napi::Number>().Int32Value()),
        jsObject.Get("start").As<Napi::Number>().Int32Value(),
        jsObject.Get("length").As<Napi::Number>().Int32Value()
      });
    }

    try {
      DocumentManager::getInstance().restoreFile(
        sessionKey, fileId, filePath, original, add, pieces
      );
    } catch(const std::exception& e) {
      Napi::Error::New(env, e.what())
        .ThrowAsJavaScriptException();
    }
    return env.Undefined();
  }

  // called once by nodejs when nodejs does: engine = require('engine.node) {Register all function in exports objects}
  Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("openFile",           Napi::Function::New(env, OpenFile));
    exports.Set("closeFile",          Napi::Function::New(env, CloseFile));
    exports.Set("closeSession",       Napi::Function::New(env, CloseSession));
    exports.Set("insert",             Napi::Function::New(env, Insert));
    exports.Set("remove",             Napi::Function::New(env, Remove));
    exports.Set("setModifyingUser",   Napi::Function::New(env, SetModifyingUser));
    exports.Set("clearModifyingUser", Napi::Function::New(env, ClearModifyingUser));
    exports.Set("getModifyingUser",   Napi::Function::New(env, GetModifyingUser));
    exports.Set("setViewer",          Napi::Function::New(env, SetViewer));
    exports.Set("clearViewer",        Napi::Function::New(env, ClearViewer));
    exports.Set("getBuffer",          Napi::Function::New(env, GetBuffer));
    exports.Set("getPieces",          Napi::Function::New(env, GetPieces));
    exports.Set("getAllFileStates",   Napi::Function::New(env, GetAllFileStates));
    exports.Set("restoreFile",        Napi::Function::New(env, RestoreFile));
    return exports;
  }

  NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init); // tells node.js to call Init on Load. Name is defined in bindings.gyp (engine in my case)

};