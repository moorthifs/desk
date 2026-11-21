import {useState} from 'react';
import {useNavigate, Navigate} from 'react-router-dom';
import {VStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {supabase} from '../lib/supabase';
import {useAuth} from '../lib/auth';


export default function SignupPage() {
  const {session} = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (session) return <Navigate to="/app" replace />;

  const signUp = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      return setError('Name, mobile number and email are required.');
    }
    if (!/^[6-9][0-9]{9}$/.test(phone.replace(/\D/g, '').slice(-10))) {
      return setError('Enter a valid 10-digit mobile number.');
    }
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setIsLoading(true);
    const {data, error: err} = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {full_name: fullName.trim(), firm_name: firmName.trim(), phone: phone.trim()},
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    setIsLoading(false);
    if (err) return setError(err.message);
    if (data.session) navigate('/app');
    else setDone(true);
  };

  return (
    <Center role="main" axis="both" padding={6}>
      <Section width="100%" maxWidth={440} padding={0} variant="transparent">
      <VStack gap={4} hAlign="center">
        <Card padding={8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={2} accessibilityLevel={1}>
                Create your account
              </Heading>
              <Text type="body" color="secondary" size="sm">
                For auditors, tax practitioners and companies
              </Text>
            </VStack>

            {error && <Banner status="error" title={error} container="card" />}
            {done ? (
              <Banner
                status="success"
                title="Almost done — check your email"
                description="We sent a confirmation link. Open it to activate your account, then sign in."
                container="card"
              />
            ) : (
              <>
                <TextInput label="Your name" value={fullName} onChange={setFullName} size="lg" />
                <TextInput label="Firm / company name" value={firmName} onChange={setFirmName} size="lg" isOptional />
                <TextInput label="Mobile number" value={phone} onChange={setPhone} type="tel" size="lg" placeholder="10-digit mobile" />
                <TextInput label="Email" value={email} onChange={setEmail} type="email" size="lg" placeholder="you@firm.com" />
                <TextInput
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  size="lg"
                  description="At least 8 characters"
                />
                <Button label="Create account" variant="primary" size="lg" isLoading={isLoading} onClick={signUp} />
              </>
            )}
          </VStack>
        </Card>
        <Text type="supporting" color="secondary">
          Already registered? <Link href="/login" type="supporting">Sign in</Link>
        </Text>
      </VStack>
      </Section>
    </Center>
  );
}
