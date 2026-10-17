"use client";
import Image from "next/image";
import {useState} from "react";
import {sleeperAvatarUrl} from "@/lib/sleeper-avatar";
import {ToolIcon} from "./ToolIcon";

export function TeamAvatar({name,avatarUrl,ownerAvatarUrl}:{name:string;avatarUrl?:string|null;ownerAvatarUrl?:string|null}) {
  const [failed,setFailed]=useState<string[]>([]);
  const src=[sleeperAvatarUrl(avatarUrl),sleeperAvatarUrl(ownerAvatarUrl)].find(url=>url&&!failed.includes(url));
  return src ? <Image src={src} width={48} height={48} unoptimized alt={`${name} Sleeper team`} onError={()=>setFailed(previous=>[...previous,src])}/> : <ToolIcon name="league"/>;
}
