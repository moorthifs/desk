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


export default function LoginPage() {
  const {session} = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (session) return <Navigate to="/app" replace />;

  const signIn = async () => {
    setError('');
    setNotice('');
    if (!email || !password) return setError('Please enter both email and password.');
    setIsLoading(true);
    const {error: err} = await supabase.auth.signInWithPassword({email: email.trim(), password});
    setIsLoading(false);
    if (err) return setError(err.message);
    navigate('/app');
  };

  const forgot = async () => {
    setError('');
    if (!email) return setError('Enter your email first, then tap “Forgot password”.');
    const {error: err} = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (err) setError(err.message);
    else setNotice('Password reset link sent. Please check your email.');
  };

  return (
    <Center role="main" axis="both" padding={6}>
      <Section width="100%" maxWidth={400} padding={0} variant="transparent">
      <VStack gap={4} hAlign="center">
        <Card padding={8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={2} accessibilityLevel={1}>
                Sign in
              </Heading>
              <Text type="body" color="secondary" size="sm">
                Upload returns and download your receipts
              </Text>
            </VStack>

            {error && <Banner status="error" title={error} container="card" />}
            {notice && <Banner status="success" title={notice} container="card" />}

            <TextInput label="Email" value={email} onChange={setEmail} type="email" size="lg" placeholder="you@firm.com" />
            <TextInput label="Password" value={password} onChange={setPassword} type="password" size="lg" />

            <Button label="Sign in" variant="primary" size="lg" isLoading={isLoading} onClick={signIn} />
            <Button label="Forgot password" variant="ghost" onClick={forgot} />
          </VStack>
        </Card>
        <Text type="supporting" color="secondary">
          New here? <Link href="/signup" type="supporting">Create an account</Link>
        </Text>
      </VStack>
      </Section>
    </Center>
  );
}
