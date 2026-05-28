'use client'

import Image from 'next/image'

import {
  ChangeEvent,
  useRef,
  useState,
} from 'react'

import {
  Loader2,
  Upload,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { useUserIdentity } from '@/lib/hooks/useUserIdentity'
import { Profile } from '@/lib/supabase/types'



interface EditProfileModalProps {
  open: boolean
  onClose: () => void
  currentProfile: Profile | null
  onUpdateSuccess: () => void
}

export default function EditProfileModal({
  open,
  onClose,
  currentProfile,
  onUpdateSuccess,
}: EditProfileModalProps) {
  const { profile } =
    useUserIdentity()

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    )
  
  const [fullName, setFullName] = useState(currentProfile?.full_name || "")

  const [bio, setBio] = useState(
    profile?.bio ?? ''
  )
  const [avatarFile, setAvatarFile] =
    useState<File | null>(null)

  const [avatarPreview, setAvatarPreview] =
    useState(
      profile?.avatar_url ?? ''
    )

  const [isSaving, setIsSaving] =
    useState(false)

  if (!open) {
    return null
  }

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    setAvatarFile(file)

    setAvatarPreview(
      URL.createObjectURL(file)
    )
  }

  const handleSave = async () => {
    if (!profile) {
      return
    }

    try {
      setIsSaving(true)

      let avatarUrl =
        profile.avatar_url

      if (avatarFile) {
        const fileExt =
          avatarFile.name.split('.').pop()

        const filePath = `${profile.id}/${crypto.randomUUID()}.${fileExt}`

        const { error: uploadError } =
          await supabase.storage
            .from('post-media')
            .upload(
              filePath,
              avatarFile,
              {
                upsert: true,
              }
            )

        if (uploadError) {
          throw uploadError
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from('post-media')
          .getPublicUrl(filePath)

        avatarUrl =
          publicUrlData.publicUrl
      }

      const { error } =
        await supabase
          .from('profiles')
          .update({
            bio,
            avatar_url: avatarUrl,
          })
          .eq('id', profile.id)

      if (error) {
        throw error
      }
      onUpdateSuccess()
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800/60 bg-slate-950 shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Edit Profile
          </h2>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900/40 text-slate-400 transition hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="space-y-5 p-5">
          
          {/* AVATAR */}
          <div className="flex items-center gap-4">
            <Image
              src={
                avatarPreview ||
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop'
              }
              alt="Avatar"
              width={72}
              height={72}
              style={{
                width: '72px',
                height: '72px',
              }}
              className="rounded-full object-cover ring-1 ring-slate-800"
            />

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-yellow-600/30 hover:text-yellow-600 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Upload Avatar
              </button>
            </div>
          </div>

          {/**Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Display Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-900/30 px-3 py-2 text-xs text-slate-200 outline-none focus:border-yellow-600/40"
            />
          </div>

          {/* BIO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Bio
              </p>

              <span className="text-[11px] text-slate-600">
                {bio.length}/200
              </span>
            </div>

            <textarea
              maxLength={200}
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
              placeholder="Describe your investment philosophy..."
              className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-800/50 bg-slate-900/30 px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-yellow-600/40"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end border-t border-slate-900 px-5 py-4">
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex min-w-[140px] items-center justify-center gap-2 rounded-full bg-yellow-600 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-yellow-500 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}