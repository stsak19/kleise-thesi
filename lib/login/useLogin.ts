import { useState } from 'react';
import { sb } from '../supabase';
import { demoSession, setDemo } from '../demo';

export type Mode = 'in' | 'up';

/* Η λογική της σύνδεσης/εγγραφής, κοινή για όλες τις εκδοχές της οθόνης. */
export function useLogin(initial: Mode = 'in') {
  const [mode, setModeRaw] = useState<Mode>(initial);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const setMode = (m: Mode) => { setModeRaw(m); setErr(''); setInfo(''); };
  const cleanEmail = () => email.trim().toLowerCase();
  const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

  const go = async () => {
    const e = cleanEmail();
    if (!emailOk(e)) return setErr('Το email δεν φαίνεται σωστό');
    if (pass.length < 6) return setErr('Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες');
    setBusy(true); setErr(''); setInfo('');
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email: e, password: pass })
      : await sb.auth.signUp({ email: e, password: pass });
    if (error) {
      setBusy(false);
      const m = error.message.toLowerCase();
      setErr(m.includes('invalid login') ? 'Λάθος email ή κωδικός'
        : m.includes('already registered') ? 'Υπάρχει ήδη λογαριασμός με αυτό το email. Κάνε σύνδεση.'
        : m.includes('not confirmed') ? 'Το email δεν έχει επιβεβαιωθεί'
        : 'Κάτι πήγε στραβά, δοκίμασε ξανά');
      return;
    }
    // Στην εγγραφή, το όνομα πάει κατευθείαν στο προφίλ.
    if (mode === 'up' && data.session && name.trim()) {
      const [first, ...rest] = name.trim().split(/\s+/);
      await sb.from('profiles').upsert({ id: data.session.user.id, first_name: first, last_name: rest.join(' ') });
    }
    setBusy(false);
    if (mode === 'up' && !data.session) setInfo('Σου στείλαμε email επιβεβαίωσης. Άνοιξέ το και μετά κάνε σύνδεση.');
  };

  const forgot = async () => {
    const e = cleanEmail();
    if (!emailOk(e)) return setErr('Γράψε πρώτα το email σου και πάτα ξανά «Ξέχασες τον κωδικό;»');
    setBusy(true); setErr('');
    const { error } = await sb.auth.resetPasswordForEmail(e);
    setBusy(false);
    if (error) setErr('Κάτι πήγε στραβά, δοκίμασε ξανά');
    else setInfo('Σου στείλαμε email για να ορίσεις νέο κωδικό.');
  };

  const guest = async () => {
    setBusy(true); setDemo(true);
    const ds = demoSession();
    const { error } = await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
    setBusy(false);
    if (error) { setDemo(false); setErr('Κάτι πήγε στραβά, δοκίμασε ξανά'); }
  };

  return { mode, setMode, name, setName, email, setEmail, pass, setPass, show, setShow, err, info, busy, go, forgot, guest };
}
export type LoginState = ReturnType<typeof useLogin>;
