"use client";
import {useEffect} from "react";
import {trackProductEvent} from "@/lib/product-events";
export function EventTracker({event}:{event:string}){useEffect(()=>{void trackProductEvent(event);},[event]);return null;}
