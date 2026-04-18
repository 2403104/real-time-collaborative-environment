#include "PieceTable.h"
#include <stdexcept>

namespace CppEngine {
  
  static int subtreeLen(PieceNode* node, PieceNode* nil) {
    if(node == nil) return 0;
    return subtreeLen(node -> left, nil) + node -> piece.length + subtreeLen(node -> right, nil);
  }

  // New file or Mongodb load
  PieceTable::PieceTable(const std::string& originalContent) :
    _original(originalContent),
    _add(""),
    _totalLength(static_cast<int>(originalContent.size())) {
      _nil = new PieceNode;
      _nil -> isRed = false;
      _nil -> left = _nil -> right = _nil -> parent = _nil;
      _nil -> leftLen = 0;
      _nil -> piece = Piece{BufferType::ORIGINAL, 0, 0};
      _root = _nil;

      if(!originalContent.empty()) {
        Piece p {
          BufferType::ORIGINAL,
          0,
          static_cast<int>(originalContent.size())        
        };
        PieceNode* node = makeNode(p);
        _root = node;
        _root -> isRed = false;
        _root -> parent = _nil;      
      }
    }

    // Rebuild from Redis snapshot
    PieceTable::PieceTable (
      const std::string& original,
      const std::string& add,
      const std::vector<Piece>& pieces    
    ) 
      :
      _original(original),
      _add(add),
      _totalLength(0)
    {
      _nil          = new PieceNode();
      _nil->isRed   = false;
      _nil->left    = _nil;
      _nil->right   = _nil;
      _nil->parent  = _nil;
      _nil->leftLen = 0;
      _nil->piece   = { BufferType::ORIGINAL, 0, 0 };

      _root = _nil;

      if(pieces.empty()) return;

      for(const auto &p : pieces) {
        _totalLength += p.length;
      }

      int blackHeight = 0;
      {
        int n = static_cast<int>(pieces.size());
        int h = 0;
        while((1 << h) <= n) h++;
        blackHeight = h;
      }

      _root = bulkLoad(pieces, 0, static_cast<int>(pieces.size()) - 1, blackHeight, _nil);

      if(_root != _nil) {
        _root -> isRed = false;
        _root -> parent = _nil;      
      }
    }

    PieceTable::~PieceTable() {
      destroyTree(_root);
      delete _nil;
    }

    PieceNode* PieceTable::makeNode(const Piece& piece) {
      PieceNode* node = new PieceNode();
      node -> piece = piece;
      node -> leftLen = 0;
      node -> isRed = true;
      node -> left = _nil;
      node -> right = _nil;
      node -> parent = _nil;
      return node;
    }

    void PieceTable::destroyTree(PieceNode* node) {
      if(node == _nil) return;
      destroyTree(node -> left);
      destroyTree(node -> right);
      delete node;
    }

    void PieceTable::recalcLeftLen(PieceNode* node) {
      if(node == _nil) return ;
      node -> leftLen = subtreeLen(node -> left, _nil);
    }

    void PieceTable::updateLeftLen(PieceNode* node) {
      while(node != _nil) {
        recalcLeftLen(node);
        node = node -> parent;
      }
    }

    PieceNode* PieceTable::minimum(PieceNode* node) const {
      while(node -> left != _nil) {
        node = node -> left;
      }
      return node;
    }

    int PieceTable::length() const {
      return _totalLength;
    }

    void PieceTable::inorder(PieceNode* node, std::vector<Piece>& result) const {
      if(node == _nil) return;
      inorder(node -> left, result);
      result.push_back(node -> piece);
      inorder(node -> right, result);
    }

    void PieceTable::buildBuffer(PieceNode* node, std::string& result) const {
      if(node == _nil) return;
      buildBuffer(node -> left, result);
      const std::string &buf = (node -> piece.bufferType == BufferType::ORIGINAL) ? _original : _add;
      result += buf.substr(node -> piece.start, node -> piece.length);
      buildBuffer(node -> right, result);
    }

    std::string PieceTable::getBuffer() const {
      std::string result;
      result.reserve(_totalLength);
      buildBuffer(_root, result);
      return result;
    }

    std::vector<Piece> PieceTable::getPieces() const {
      std::vector<Piece> result;
      result.reserve(32);   
      inorder(_root, result);
      return result;
    }

    PieceNode* PieceTable::bulkLoad(
      const std::vector<Piece> &piece,
      int start,
      int end,
      int blackHeight,
      PieceNode* parent
    ) {
      if(start > end) return _nil;
      int mid = (start + end) >> 1;
      PieceNode* node = makeNode(piece[mid]);
      node -> parent = parent;
      node -> isRed = (blackHeight == 1);
      node -> left = bulkLoad(piece, start, mid - 1, blackHeight - 1, node);
      node -> right = bulkLoad(piece, mid + 1, end, blackHeight - 1, node);
      node -> leftLen = subtreeLen(node -> left, _nil);
      return node;
    }

    void PieceTable::rotateLeft(PieceNode* x) {
      PieceNode* y = x -> right;
      x -> right = y -> left;
      if(y -> left != _nil) y -> left -> parent = x;
      y -> parent = x -> parent;
      if(x -> parent == _nil) {
        _root = y;
      } else if(x == x -> parent -> left) {
        x -> parent -> left = y;
      } else {
        x -> parent -> right = y;
      }
      y -> left = x;
      x -> parent = y;
      // y -> leftLen = subtreeLen(y -> left, _nil);
      y -> leftLen = x -> leftLen + x -> piece.length + y -> leftLen;
    }

    void PieceTable::rotateRight(PieceNode* x) {
      PieceNode* y = x -> left;
      x -> left = y -> right;
      if(y -> right != _nil) y -> right -> parent = x;
      y -> parent = x -> parent;
      if(x -> parent == _nil) {
        _root = y;
      } else if(x == x -> parent -> left) {
        x -> parent -> left = y;
      } else {
        x -> parent -> right = y;
      }
      y -> right = x;
      x -> parent = y;
      // x -> leftLen = subtreeLen(y -> left, _nil);
      x -> leftLen = x -> leftLen - y -> leftLen - y -> piece.length;
    }

    void PieceTable::fixInsert(PieceNode* z) {
      while(z -> parent -> isRed) {
        if(z -> parent == z -> parent -> parent -> left) {
          PieceNode* uncle = z -> parent -> parent -> right;
          if(uncle -> isRed) {
            z -> parent -> isRed = false;
            uncle -> isRed = false;
            z -> parent -> parent -> isRed = true;
            z = z -> parent -> parent;
          } else {
            if(z == z -> parent -> right) {
              z = z -> parent;
              rotateLeft(z);
            }
            z -> parent -> isRed = false;
            z -> parent -> parent -> isRed = true;
            rotateRight(z -> parent -> parent);
          }
        } else {
          PieceNode* uncle = z -> parent -> parent -> left;
          if(uncle -> isRed) {
            z -> parent -> isRed = false;
            uncle -> isRed = false;
            z -> parent -> parent -> isRed = true;
            z = z -> parent -> parent;
          } else {
            if(z == z -> parent -> left) {
              z = z -> parent;
              rotateRight(z);
            }
            z -> parent -> isRed = false;
            z -> parent -> parent -> isRed = true;
            rotateLeft(z -> parent -> parent);
          }
        }
      }
      _root -> isRed = false;
    }

    void PieceTable::transplant(PieceNode* u, PieceNode* v) {
      if(u -> parent == _nil) {
        _root = v;
      } else if(u == u -> parent -> left) {
        u -> parent -> left = v;
      } else {
        u -> parent -> right = v;
      }
      v -> parent = u -> parent;
    }

    void PieceTable::fixDelete(PieceNode* x) {
      while(x != _root && !x -> isRed) {
        if(x == x -> parent -> left) {
          PieceNode* w = x -> parent -> right;
          if (w -> isRed) {
            w -> isRed = false;
            x -> parent -> isRed = true;
            rotateLeft(x -> parent);
            w = x -> parent -> right;
          }
          if(!w -> left -> isRed && !w -> right -> isRed) {
            w -> isRed = true;
            x = x -> parent;
          } else {
            if(!w -> right -> isRed) {
              w -> left -> isRed = false;
              w -> isRed = true;
              rotateRight(w);
              w = x -> parent -> right;
            }
            w -> isRed = x -> parent -> isRed;
            x -> parent -> isRed = false;
            w -> right -> isRed = false;
            rotateLeft(x -> parent);
            x = _root;
          }
        } else {
          PieceNode* w = x -> parent -> left;
          if (w -> isRed) {
            w -> isRed = false;
            x -> parent -> isRed = true;
            rotateRight(x -> parent);
            w = x -> parent -> left;
          }
          if(!w -> right -> isRed && !w -> left -> isRed) {
            w -> isRed = true;
            x = x -> parent;
          } else {
            if(!w -> left -> isRed) {
              w -> right -> isRed = false;
              w -> isRed = true;
              rotateLeft(w);
              w = x -> parent -> left;
            }
            w -> isRed = x -> parent -> isRed;
            x -> parent -> isRed = false;
            w -> left -> isRed = false;
            rotateRight(x -> parent);
            x = _root;
          }
        }
      }
      x -> isRed = false;
    }

    FindResult PieceTable::findNode(int offset) const {
      if(offset < 0 || offset > _totalLength) {
        throw std::out_of_range("PieceTable::findNode - offset out of range");
      }
      PieceNode* curr = _root;
      
      if(offset == _totalLength && curr != _nil) {
        while(curr -> right != _nil) curr = curr -> right;
        return {curr, curr -> piece.length};
      }

      while(curr != _nil) {
        if(offset < curr -> leftLen) {
          curr = curr -> left;
        } else {
          offset -= curr -> leftLen;
          if(offset <= curr -> piece.length) {
            return {curr, offset};
          }
          offset -= curr -> piece.length;
          curr = curr -> right;
        }
      }
      throw std::out_of_range("PieceTable::findNode - walked off tree");
      return {_nil, 0};
    }

    void PieceTable::insertNodeAfter(PieceNode* node, PieceNode* newNode) {
      if(_root == _nil) { //document is completely blank
        _root = newNode;
        newNode -> parent = _nil;
        newNode -> isRed = false;
        return;
      }
      if(node == _nil) { // insert position is before the very first node
        PieceNode* leftmost = minimum(_root);
        leftmost -> left = newNode;
        newNode -> parent = leftmost;
      } else if(node -> right == _nil) {
        node -> right = newNode;
        newNode -> parent = node;      
      } else {
        PieceNode* successor = minimum(node -> right);
        successor -> left = newNode;
        newNode -> parent = successor;      
      }
      updateLeftLen(newNode -> parent);
      fixInsert(newNode);
      updateLeftLen(newNode);
    }

    void PieceTable::insertNodeBefore(PieceNode* node, PieceNode* newNode) {
      if(_root == _nil) { //document is completely blank
        _root = newNode;
        newNode -> parent = _nil;
        newNode -> isRed = false;
        return;
      }
      if(node -> left == _nil) {
        node -> left = newNode;
        newNode -> parent = node;
      } else {
        PieceNode* pred = node -> left;
        while(pred -> right != _nil) {
          pred = pred -> right;        
        }
        pred -> right = newNode;
        newNode -> parent = pred;      
      }
      updateLeftLen(newNode -> parent);
      fixInsert(newNode);
      updateLeftLen(newNode);
    }


    void PieceTable::deleteNode(PieceNode* z) {
      PieceNode* y = z;
      PieceNode* x = _nil;
      bool yOriginallyRed = y -> isRed;
      if(z -> left == _nil) {
        x = z -> right;
        transplant(z, z -> right);
        updateLeftLen(z -> parent);
      } else if(z -> right == _nil) {
        x = z -> left;
        transplant(z, z -> left);
        updateLeftLen(z -> parent);      
      } else {
        y = minimum(z -> right);
        yOriginallyRed = y ->  isRed;
        x = y -> right;
        if(y -> parent == z) {
          x -> parent = y;
        } else {
          transplant(y, y -> right);
          y -> right = z -> right;
          y -> right -> parent = y;
        }
        transplant(z, y);
        y -> left = z -> left;
        y -> left -> parent = y;
        y -> isRed = z -> isRed;
        updateLeftLen(y);
      }
      delete(z);
      if(!yOriginallyRed) {
        fixDelete(x);
        updateLeftLen(x);      
      }
    }

    void PieceTable::insert(int offset, const std::string& text) {
      if(text.empty()) return;
      int addStart = static_cast<int>(_add.size());
      _add += text;
      Piece newPiece { BufferType::ADD, addStart, static_cast<int>(text.size()) };
      PieceNode* newNode = makeNode(newPiece);
      if(_root == _nil) {
        _root = newNode;
        _root -> isRed = false;
        _root -> parent = _nil;
        _totalLength += static_cast<int>(text.size());
        return;
      }
      FindResult found = findNode(offset);
      if(found.node == _nil) {
        PieceNode* rightmost = _root;
        while(rightmost -> right != _nil) {
          rightmost = rightmost -> right;
        }
        insertNodeAfter(rightmost, newNode);
      } else if(found.offsetInPiece == 0) {
        insertNodeBefore(found.node, newNode);
      } else {
        Piece leftPiece { found.node -> piece.bufferType, found.node -> piece.start, found.offsetInPiece };
        Piece rightPiece { found.node -> piece.bufferType, found.node -> piece.start + found.offsetInPiece, found.node -> piece.length - found.offsetInPiece };
        found.node -> piece = leftPiece;
        PieceNode* rightNode = makeNode(rightPiece);
        insertNodeAfter(found.node, newNode);
        insertNodeAfter(newNode, rightNode);
      }
      _totalLength += static_cast<int>(text.size());
    }

    void PieceTable::remove(int offset, int length) {
      if(length <= 0) return;
      if(offset < 0 || offset + length > _totalLength) {
        throw std::out_of_range("PieceTable::remove — range out of bounds");
      }
      FindResult found = findNode(offset);
      PieceNode* node = found.node;
      int inPiece = found.offsetInPiece;
      int remaining = length;
      while(remaining > 0 && node != _nil) {
        int charsAvailable = node -> piece.length - inPiece;
        if(remaining >= charsAvailable) {
          if(inPiece == 0) {
            PieceNode* successor = node -> right != _nil ? minimum(node -> right) : _nil;
            if(successor == _nil) {
              PieceNode* p = node -> parent;
              PieceNode* c = node;
              while(p != _nil && c == p -> right) {
                c = p;
                p = p -> parent;
              }
              successor = p;
            }
            remaining -= node -> piece.length;
            deleteNode(node);
            node = successor;
            inPiece = 0;
          } else {
            remaining -= charsAvailable;
            node -> piece.length = inPiece;
            updateLeftLen(node);
            PieceNode* successor = node -> right != _nil ? minimum(node -> right) : _nil;
            if(successor == _nil) {
              PieceNode* p = node -> parent;
              PieceNode* c = node;
              while(p != _nil && c == p -> right) {
                c = p;
                p = p -> parent;
              }
              successor = p;
            }
            node = successor;
            inPiece = 0;
          }
        } else {
          if(inPiece == 0) {
            node -> piece.start += remaining;
            node -> piece.length -= remaining;
            updateLeftLen(node);
            remaining = 0;
          } else {
            Piece rightPiece { node -> piece.bufferType, node -> piece.start + inPiece + remaining, node -> piece.length - inPiece - remaining };
            node -> piece.length = inPiece;
            updateLeftLen(node);
            PieceNode* rightNode = makeNode(rightPiece);
            insertNodeAfter(node, rightNode);
            remaining = 0;
          }
        }
      }
      _totalLength -= length;
    }
};