#pragma once

#include <string>
#include <list>
#include <vector>

namespace CppEngine {

  enum class BufferType {
    ORIGINAL, 
    ADD
  };

  struct Piece {
    BufferType bufferType;
    int start;
    int length;
  };

  struct PieceNode {
    Piece piece;
    int leftLen; // total char length of left subtree
    bool isRed;
    PieceNode* left;
    PieceNode* right;
    PieceNode* parent;
  };

  struct FindResult {
    PieceNode* node;    // Node that owns that offset
    int offsetInPiece;  // How far inside that piece
  };

  class PieceTable {
  public:

    /// @brief Initialize with existing file content (loaded from MongoDB).
    /// @param originalContent pass empty string "" for a new file    
    explicit PieceTable(const std::string& originalContent);

    /// @brief Reconstruct from a Redis snapshot (crash recovery).
    /// @param original  the original buffer at time of snapshot
    /// @param add       the add buffer at time of snapshot
    /// @param pieces    in-order piece array returned by getPieces()
    PieceTable(
      const std::string& original,
      const std::string& add,
      const std::vector<Piece>& pieces
    );

    /// @brief Destructor — frees all nodes
    ~PieceTable();

    // no copy - too expensive and not needed
    PieceTable(const PieceTable&) = delete;
    PieceTable& operator=(const PieceTable&) = delete;

    /// @brief  Insert text at an absolute offset
    /// @param offset rangeOffset from VS Code
    /// @param text text to insert
    void insert(int offset, const std::string& text);

    /// @brief Delete characters starting at an absolute offset.
    /// @param offset rangeOffset from VS Code
    /// @param length rangeLength from VS Code
    void remove(int offset, int length);

    /// @brief Reconstruct and return the full file content as a string
    /// @return Called every 10s - Node.js saves the result to the MongoDb
    std::string getBuffer() const;

    /// @brief Return the piece list as a vector for Redis snapshot.
    /// @note  Called every 5-6s — Node.js serializes to JSON and stores in Redis.
    ///        On crash recovery, Node.js feeds this back to reconstruct the table.
    std::vector<Piece> getPieces() const;

    /// @brief Returns total character count across all pieces.
    int length() const;

  private:

    std::string _original;    // set once in the constructor
    std::string _add;         // grow as user types
    PieceNode* _root;         // root of the RBT
    PieceNode* _nil;          // nil node (always black)
    int _totalLength;         // total chars across all pieces

    /// @brief Allocate and initialize a new red node.
    PieceNode* makeNode(const Piece& piece);

    /// @brief Rotate left around node x.
    /// @note Updates leftLen on affected nodes.
    void rotateLeft(PieceNode* node);

    /// @brief Rotate right around node x.
    /// @note  Updates leftLen on affected nodes. 
    void rotateRight(PieceNode* node);

    /// @brief Fix RBT color violations after a standard BST insert.
    void fixInsert(PieceNode* node);

    /// @brief Replace subtree u with subtree v in the tree
    void transplant(PieceNode* u, PieceNode* v);

    /// @brief Fix RBT color violations after a standard BST delete.
    void fixDelete(PieceNode* node);

    /// @brief Find the in-order minimum (leftmost node) of a subtree.
    PieceNode* minimum(PieceNode* node) const;

    /// @brief Find which node owns the given absolute offset.
    /// @return FindResult with the node and remainder offsetInPiece
    FindResult findNode(int offset) const;

    /// @brief Insert a new node into the RBT after a given node.
    /// @note  Calls fixInsert and updates leftLen up the tree.
    void insertNodeAfter(PieceNode* node, PieceNode* newNode);

    /// @brief Insert a new node into the RBT before a given node.
    void insertNodeBefore(PieceNode* node, PieceNode* newNode);

    /// @brief Delete a node from the RBT.
    /// @note Calls fixDelete and updates leftLen up the tree.
    void deleteNode(PieceNode* node);

    /// @brief Update leftLen for all ancestors of a node.
    /// @note Called after any structural change.
    void updateLeftLen(PieceNode* node);

    /// @brief Recursively free all nodes except _nil.
    void destroyTree(PieceNode* node);

    /// @brief Inorder traversal — appends pieces to result vector.
    void inorder(PieceNode* node, std::vector<Piece>& result) const;

    /// @brief Inorder traversal — reconstructs buffer string.
    void buildBuffer(PieceNode* node, std::string& result) const;

    /// @brief Bulk load a sorted piece vector into a balanced RBT.
    /// @note  Used by the recovery constructor. O(n), zero rotations.
    PieceNode* bulkLoad(
      const std::vector<Piece> &piece,
      int start,
      int end,
      int blackHeight,
      PieceNode* parent
    );

    /// @brief Recompute leftLen for a single node from its children.
    void recalcLeftLen(PieceNode* node);
  };
};