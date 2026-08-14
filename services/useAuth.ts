import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ role: string; usage_count: number; max_usage: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy thông tin phiên đăng nhập
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error && data) {
      setProfile(data);
    }
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Kiểm tra và trừ 1 lượt dùng thử
  const checkAndConsumeUsage = async (): Promise<boolean> => {
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản Google để sử dụng tính năng!');
      loginWithGoogle();
      return false;
    }

    if (!profile) return false;

    // Tài khoản Pro -> Dùng không giới hạn
    if (profile.role === 'pro') return true;

    // Tài khoản Free -> Kiểm tra số lượt còn lại
    if (profile.usage_count >= profile.max_usage) {
      alert('Bạn đã hết 3 lượt dùng thử miễn phí. Vui lòng liên hệ Admin để nâng cấp Pro hoặc sử dụng nút "Đổi Key" cá nhân!');
      return false;
    }

    const nextCount = profile.usage_count + 1;
    const { error } = await supabase.from('profiles').update({ usage_count: nextCount }).eq('id', user.id);
    if (!error) {
      setProfile({ ...profile, usage_count: nextCount });
      return true;
    }
    return false;
  };

  return { user, profile, loading, loginWithGoogle, logout, checkAndConsumeUsage };
}