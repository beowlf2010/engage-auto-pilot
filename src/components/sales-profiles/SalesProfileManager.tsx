import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, Phone, Mail, Globe, Star, Eye, Users, 
  QrCode, Save, Plus, Trash2, Upload, ExternalLink 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  getUserSalesProfile, 
  createSalesProfile, 
  updateSalesProfile,
  getProfileTestimonials,
  getProfileFeaturedVehicles,
  type SalesProfile 
} from '@/services/salesProfileService';

const SalesProfileManager = () => {
  const [profile, setProfile] = useState<SalesProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    title: 'Sales Professional',
    bio: '',
    phone_number: '',
    email: '',
    specialties: [] as string[],
    years_experience: '',
    languages_spoken: [] as string[],
    custom_message: '',
    show_inventory: true,
    show_testimonials: true,
    personal_brand_colors: {
      primary: '#2563eb',
      secondary: '#64748b'
    },
    social_links: {
      linkedin: '',
      facebook: '',
      instagram: ''
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const existingProfile = await getUserSalesProfile();
      
      if (existingProfile) {
        setProfile(existingProfile);
        setFormData({
          display_name: existingProfile.display_name,
          title: existingProfile.title,
          bio: existingProfile.bio || '',
          phone_number: existingProfile.phone_number || '',
          email: existingProfile.email || '',
          specialties: existingProfile.specialties || [],
          years_experience: existingProfile.years_experience?.toString() || '',
          languages_spoken: existingProfile.languages_spoken || [],
          custom_message: existingProfile.custom_message || '',
          show_inventory: existingProfile.show_inventory,
          show_testimonials: existingProfile.show_testimonials,
          personal_brand_colors: existingProfile.personal_brand_colors,
          social_links: existingProfile.social_links
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      const profileData = {
        ...formData,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
      };

      let savedProfile;
      if (profile) {
        savedProfile = await updateSalesProfile(profile.id, profileData);
      } else {
        savedProfile = await createSalesProfile(profileData);
      }

      if (savedProfile) {
        setProfile(savedProfile);
        toast({
          title: 'Success',
          description: `Profile ${profile ? 'updated' : 'created'} successfully`,
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: `Failed to ${profile ? 'update' : 'create'} profile`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArrayInput = (field: 'specialties' | 'languages_spoken', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleColorChange = (colorType: 'primary' | 'secondary', color: string) => {
    setFormData(prev => ({
      ...prev,
      personal_brand_colors: {
        ...prev.personal_brand_colors,
        [colorType]: color
      }
    }));
  };

  const handleSocialLinkChange = (platform: string, url: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: url
      }
    }));
  };

  const profileUrl = profile?.profile_slug ? 
    `${window.location.origin}/profile/${profile.profile_slug}` : '';

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Professional Profile</h1>
          <p className="text-muted-foreground">
            Create your personalized lead capture page
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-4">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{profile.page_views} views</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{profile.leads_generated} leads</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(profileUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Profile
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Senior Sales Consultant"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell potential customers about yourself..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@dealership.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                  <Input
                    id="specialties"
                    value={formData.specialties.join(', ')}
                    onChange={(e) => handleArrayInput('specialties', e.target.value)}
                    placeholder="Luxury vehicles, First-time buyers, Trade-ins"
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, years_experience: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="languages">Languages Spoken (comma-separated)</Label>
                <Input
                  id="languages"
                  value={formData.languages_spoken.join(', ')}
                  onChange={(e) => handleArrayInput('languages_spoken', e.target.value)}
                  placeholder="English, Spanish, French"
                />
              </div>

              <div>
                <Label htmlFor="custom_message">Custom Welcome Message</Label>
                <Textarea
                  id="custom_message"
                  value={formData.custom_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_message: e.target.value }))}
                  placeholder="Welcome to my profile! I'm here to help you find your perfect vehicle..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Inventory</Label>
                  <p className="text-sm text-muted-foreground">
                    Display featured vehicles on your profile
                  </p>
                </div>
                <Switch
                  checked={formData.show_inventory}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_inventory: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Testimonials</Label>
                  <p className="text-sm text-muted-foreground">
                    Display customer reviews and testimonials
                  </p>
                </div>
                <Switch
                  checked={formData.show_testimonials}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_testimonials: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.personal_brand_colors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.personal_brand_colors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      placeholder="#2563eb"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.personal_brand_colors.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.personal_brand_colors.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                      placeholder="#64748b"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <Input
                  id="linkedin"
                  value={formData.social_links.linkedin || ''}
                  onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook Profile</Label>
                <Input
                  id="facebook"
                  value={formData.social_links.facebook || ''}
                  onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/yourprofile"
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram Profile</Label>
                <Input
                  id="instagram"
                  value={formData.social_links.instagram || ''}
                  onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
            </Button>
          </div>
        </div>

        {/* Profile Preview & QR Code */}
        <div className="space-y-6">
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code & Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <QrCode className="w-24 h-24 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-muted-foreground">
                    QR Code for business cards
                  </p>
                </div>
                
                <div>
                  <Label>Profile URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={profileUrl}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(profileUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.specialties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specialties Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesProfileManager;