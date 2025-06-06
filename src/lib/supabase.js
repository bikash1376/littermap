import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to upload image to Supabase Storage
export const uploadImage = async (imageFile, userId) => {
  try {
    const fileExt = 'png'
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    // Convert data URL to blob
    const response = await fetch(imageFile)
    const blob = await response.blob()
    
    const { data, error } = await supabase.storage
      .from('marker-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('marker-images')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

// Helper function to save marker to database
export const saveMarker = async (latitude, longitude, imageUrl, caption, userId) => {
  try {
    const { data, error } = await supabase
      .from('markers')
      .insert([
        {
          latitude,
          longitude,
          image_url: imageUrl,
          caption,
          user_id: userId
        }
      ])
      .select()

    if (error) {
      throw error
    }

    return data[0]
  } catch (error) {
    console.error('Error saving marker:', error)
    throw error
  }
}

// Helper function to fetch all markers
export const fetchMarkers = async () => {
  try {
    const { data, error } = await supabase
      .from('markers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching markers:', error)
    throw error
  }
}