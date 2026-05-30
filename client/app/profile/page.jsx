"use client";

import React, { useState } from "react";
import RawImage from '../../components/ui/RawImage'
import { useAuthStore } from "../../store/authStore";
import { ShieldCheck, Star, Clock, MapPin, User, Settings, Edit3, Save } from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { apiService } from "../../lib/api";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  
  // Prefill fields
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [latitude, setLatitude] = useState(user?.latitude ?? "");
  const [longitude, setLongitude] = useState(user?.longitude ?? "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  if (!user) return null;

  const handleSave = (e) => {
    e.preventDefault();
    apiService.updateProfile({ name, phone, location, bio, avatar, latitude, longitude })
      .then((response) => {
        const updatedUser = response?.data;
        if (updatedUser) {
          updateProfile(updatedUser);
          setName(updatedUser.name || "");
          setPhone(updatedUser.phone || "");
          setLocation(updatedUser.location || "");
          setLatitude(updatedUser.latitude ?? "");
          setLongitude(updatedUser.longitude ?? "");
          setBio(updatedUser.bio || "");
          setAvatar(updatedUser.avatar || "");
        }
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || "Failed to update profile.");
      });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) {
      toast.error('Geolocation not available in this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      setLatitude(lat)
      setLongitude(lon)

      // Reverse-geocode to a friendly label
      try {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse')
        url.searchParams.set('latitude', String(lat))
        url.searchParams.set('longitude', String(lon))
        url.searchParams.set('language', 'en')
        url.searchParams.set('format', 'json')

        const res = await fetch(url)
        if (res.ok) {
          const d = await res.json()
          const name = d?.name
          const admin = d?.admin1
          const country = d?.country
          const label = [name, admin, country].filter(Boolean).join(', ')
          if (label) setLocation(label)
        }
      } catch (err) {
        // ignore reverse geocode failures
      }

      toast.success('Using your current location')
    }, (err) => {
      toast.error('Unable to determine location')
    }, { timeout: 10000 })
  }

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                Profile Portfolio
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">
                Manage your credentials, bio, and platform trust score indicators.
              </p>
            </div>
            
            <Button
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 py-2 px-4 rounded-xl text-xs font-bold border-agri-green/20"
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              <span>{isEditing ? "Cancel Edit" : "Edit Profile"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: General Profile Info Card */}
            <div className="lg:col-span-7 space-y-6">
              {!isEditing ? (
                <Card className="border-agri-green/5 p-6 sm:p-8 space-y-6">
                  {/* Photo & Name */}
                  <div className="flex items-center gap-5">
                    <RawImage
                      src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                      alt={user.name || 'Profile image'}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover rounded-3xl border border-agri-green/10"
                    />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase bg-agri-green/10 text-agri-green px-2 py-0.5 rounded-full">
                        {user.role} Partner
                      </span>
                      <h2 className="text-2xl font-black text-agri-green-dark dark:text-agri-green-light">
                        {user.name}
                      </h2>
                      <p className="text-xs text-agri-brown font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-agri-green" /> {user.location}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-agri-green/5" />

                  {/* Bio */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-agri-green">Bio & Overview</h3>
                    <p className="text-xs sm:text-sm text-agri-brown dark:text-gray-300 leading-relaxed bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-agri-green/5">
                      {user.bio || "No biography details added. Click Edit Profile to compile your business credentials."}
                    </p>
                  </div>

                  <div className="h-px bg-agri-green/5" />

                  {/* Contact details */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-agri-brown">
                    <div className="p-3 bg-white/50 dark:bg-black/20 border border-agri-green/5 rounded-xl">
                      <p className="text-[9px] uppercase font-bold text-agri-brown-light">Email Address</p>
                      <p className="mt-1">{user.email}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-black/20 border border-agri-green/5 rounded-xl">
                      <p className="text-[9px] uppercase font-bold text-agri-brown-light">Contact Phone</p>
                      <p className="mt-1">{user.phone}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <form onSubmit={handleSave}>
                  <Card className="border-agri-green/5 p-6 sm:p-8 space-y-4">
                    <Input
                      label="Full Name / business Name"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Phone Number"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      <div>
                        <Input
                          label="Location (City, State)"
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <Button type="button" variant="ghost" onClick={handleUseCurrentLocation} className="text-xs">
                            Use my current location
                          </Button>
                          <span className="text-[10px] text-agri-brown">{latitude ? `Lat: ${latitude.toFixed ? latitude.toFixed(4) : latitude}` : ''} {longitude ? `Lon: ${longitude.toFixed ? longitude.toFixed(4) : longitude}` : ''}</span>
                        </div>
                      </div>
                    </div>
                    <Input
                      label="Avatar Image URL"
                      id="avatar"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="bio" className="text-xs font-semibold text-agri-green-dark">
                        Biography / Farmer description
                      </label>
                      <textarea
                        id="bio"
                        rows="4"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4.5 h-4.5" />
                      <span>Confirm profile Updates</span>
                    </Button>
                  </Card>
                </form>
              )}
            </div>

            {/* Right: Trust Index and Rating Cards */}
            <div className="lg:col-span-5 space-y-6">
              {/* Trust Index Card */}
              {user.role === "FARMER" && (
                <Card className="border-agri-green/5 bg-gradient-to-br from-white/70 to-agri-green/5 dark:from-[#121F16]/50 dark:to-agri-green/5 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-agri-green/5 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">Farmer Trust Index</h3>
                      <p className="text-[10px] text-agri-brown mt-0.5">Aggregated trust score metrics</p>
                    </div>
                    <ShieldCheck className="w-10 h-10 text-agri-green animate-pulse-slow" />
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-black text-agri-green">94%</p>
                      <p className="text-[9px] text-agri-brown font-bold uppercase mt-1">Overall Trust Score</p>
                    </div>
                    <div className="text-right text-[10px] text-agri-brown font-semibold space-y-1">
                      <div>Ratings (40%): <span className="font-extrabold text-agri-green">4.8 / 5.0</span></div>
                      <div>Fulfillment (40%): <span className="font-extrabold text-agri-green">97.4%</span></div>
                      <div>Response Speed (20%): <span className="font-extrabold text-agri-green">&lt; 4 hours</span></div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Review summary Board */}
              <Card className="border-agri-green/5 p-6 space-y-4">
                <CardHeader className="p-0 border-none">
                  <CardTitle className="text-sm font-bold text-agri-green">Verification Status</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs text-agri-brown space-y-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-agri-green" />
                    <span>Identity Card Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-agri-green" />
                    <span>Bank account Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-agri-green" />
                    <span>Location Coordinates Locked</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
