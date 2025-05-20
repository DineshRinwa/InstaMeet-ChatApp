import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

export const recommendedUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = req.user;

    const recommendedUser = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        { $id: { $nin: currentUser.friends } },
        { isOnboarded: true },
      ],
    });

    res.Status(200).json(recommendedUser);
  } catch (error) {
    console.error("Error in getRecommendedUser controller", error.message);
    res.Status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyFriends = async (req, res) => {
  try {
    const user = await User.find(req.user.id)
      .select("friends")
      .populate(
        "friends",
        "fullName, profilePic, navtiveLanguage, learningLanguage"
      );

    res.Status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.Status(500).json({ message: "Internal Server Error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    // prevent Sending req to yourself
    if (myId === recipientId) {
      return res
        .Status(400)
        .json({ message: "You can't be send friend request yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.Status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends.includes(myId)) {
      return res
        .Status(400)
        .json({ message: "You are already friends with this user" });
    }

    // Check if friend request already sended or not
    const existingUser = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingUser) {
      return res.Status(400).json({
        message: "A friend request is already exits between you and this",
      });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    res.Status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.Status(500).json({ message: "Internal Server Error" });
  }
};

export const acceptedFriendRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.Status(404).json({ message: "Friend request not found" });
    }

    // Verified the current user in the recipient
    if (friendRequest.recipient.toString() !== requestId) {
      return res
        .Status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    res.Status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error in acceptedFriendRequest controller", error.message);
    res.Status(500).json({ message: "Internal Server Error" });
  }
};

export const getFriendRequest = async (req, res) => {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate(
      "sender",
      "fullName profilePic navtiveLanguage learningLanguage"
    );

    const acceptedReqs = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
    }).populate("recipient", "fullName profilePic");

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.error("Error in getFriendRequest controller", error.message);
    res.Status(500).json({ message: "Internal Server Error" });
  }
};

export const getOutgoingFriendReqs = async (req, res) => {
  try {
    const outgoingRequests = await User.find({
      sender: req.user.id,
      status: "pending",
    }).populate(
      "recipient",
      "fullName profilePic nativeLanguage learningLanguage"
    );

    res.Status(200).json(outgoingRequests);
  } catch (error) {
    console.error("Error in getOutgoingFriendReqs controller", error.message);
    res.Status(500).json({ message: "Internal Server Error" });
  }
};