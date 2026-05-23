"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Users, Plus, Hash, Lock, Copy, Check } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { Group } from "@/lib/types";

const GROUP_COLORS = [
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-600",
  "from-teal-400 to-cyan-600",
  "from-rose-400 to-pink-600",
  "from-sky-400 to-blue-600",
  "from-lime-400 to-green-600",
];

export default function GroupsPage() {
  const { user, refreshUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "all">("my");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createColor, setCreateColor] = useState(GROUP_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group));
      setLoading(false);
    });
    return unsub;
  }, []);

  const myGroups = groups.filter((g) => user?.groupIds?.includes(g.id));
  const otherGroups = groups.filter((g) => !user?.groupIds?.includes(g.id));

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setJoinError("");
    setJoining(true);
    try {
      const group = groups.find((g) => g.inviteCode === joinCode.trim().toUpperCase());
      if (!group) {
        setJoinError("No group found with that invite code.");
        return;
      }
      if (user.groupIds?.includes(group.id)) {
        setJoinError("You are already a member of this group.");
        return;
      }
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayUnion(user.uid),
      });
      await updateDoc(doc(db, "users", user.uid), {
        groupIds: arrayUnion(group.id),
      });
      await refreshUser();
      setShowJoin(false);
      setJoinCode("");
    } catch {
      setJoinError("Failed to join group. Try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async () => {
    console.log("handleCreate called", { user: !!user, createName: createName.trim() });
    if (!user) {
      setCreateError("You must be logged in to create a group");
      return;
    }
    if (!createName.trim()) {
      setCreateError("Please enter a group name");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      const inviteCode = uuidv4().slice(0, 8).toUpperCase();
      console.log("Creating group with invite code:", inviteCode);
      const groupRef = await addDoc(collection(db, "groups"), {
        name: createName.trim(),
        description: createDesc.trim(),
        coverColor: createColor,
        createdBy: user.uid,
        creatorName: user.displayName,
        memberIds: [user.uid],
        inviteCode,
        postCount: 0,
        createdAt: serverTimestamp(),
      });
      console.log("Group created with ID:", groupRef.id);
      await updateDoc(doc(db, "users", user.uid), {
        groupIds: arrayUnion(groupRef.id),
      });
      await refreshUser();
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
    } catch (error) {
      console.error("Failed to create group:", error);
      setCreateError("Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const copyInviteCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayedGroups = tab === "my" ? myGroups : otherGroups;

  return (
    <>
      <TopBar
        title="Groups"
        subtitle="Your writing communities"
        right={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { console.log("Join button clicked"); setShowJoin(true); }}>
              <Hash size={14} /> Join
            </Button>
            <Button size="sm" onClick={() => { console.log("New button clicked"); setShowCreate(true); }}>
              <Plus size={14} /> New
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4">
        <div className="flex bg-stone-100 rounded-xl p-1 gap-1 mb-4">
          {(["my", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              {t === "my" ? `My Groups (${myGroups.length})` : `Discover (${otherGroups.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-stone-100" />
            ))}
          </div>
        ) : displayedGroups.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center">
              <Users size={28} className="text-stone-400" />
            </div>
            <div>
              <p className="font-semibold text-stone-700">
                {tab === "my" ? "No groups yet" : "No other groups"}
              </p>
              <p className="text-sm text-stone-400 mt-1">
                {tab === "my" ? "Create or join a group to get started" : "You're in all available groups!"}
              </p>
            </div>
            {tab === "my" && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Create Group
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card hover className="overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${group.coverColor}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-stone-900">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{group.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-stone-400 flex items-center gap-1">
                            <Users size={12} /> {group.memberIds?.length || 0} members
                          </span>
                          <span className="text-xs text-stone-400">·</span>
                          <span className="text-xs text-stone-400">{group.postCount || 0} posts</span>
                        </div>
                      </div>
                      {user?.groupIds?.includes(group.id) && user.uid === group.createdBy && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyInviteCode(group.inviteCode, group.id);
                          }}
                          className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 hover:bg-amber-100 transition"
                        >
                          {copiedId === group.id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === group.id ? "Copied!" : group.inviteCode}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create a Group">
        <div className="p-6 flex flex-col gap-4">
          {createError && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{createError}</div>
          )}
          <Input
            label="Group Name"
            placeholder="e.g. Fantasy Writers Circle"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="What's this group about?"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            rows={3}
          />
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Cover Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setCreateColor(color)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} transition-all ${
                    createColor === color ? "ring-2 ring-offset-2 ring-stone-400 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className={`h-2 rounded-full bg-gradient-to-r ${createColor}`} />
          <Button onClick={handleCreate} loading={creating} disabled={!createName.trim() || !user} size="lg" className="w-full">
            Create Group
          </Button>
        </div>
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join a Group">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Group Invite Code"
            placeholder="e.g. A1B2C3D4"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            error={joinError}
            className="uppercase tracking-widest"
          />
          <p className="text-sm text-stone-500">
            Ask the group admin for the invite code to join their group.
          </p>
          <Button onClick={handleJoin} loading={joining} disabled={!joinCode.trim()} size="lg" className="w-full">
            Join Group
          </Button>
        </div>
      </Modal>
    </>
  );
}
