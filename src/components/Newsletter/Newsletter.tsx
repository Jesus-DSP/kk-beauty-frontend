// src/components/Newsletter/Newsletter.tsx
import React from 'react';
import * as S from './Newsletter.styles';

const Newsletter: React.FC = () => (
  <S.Section id="newsletter">
    <S.Title>Join Our Newsletter</S.Title>
    <S.Form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <S.Input type="email" placeholder="Email address" />
      <S.Button type="submit">Subscribe</S.Button>
    </S.Form>
    <S.Description>Get updates and exclusive offers by signing up to our newsletter.</S.Description>
  </S.Section>
);

export default Newsletter;
