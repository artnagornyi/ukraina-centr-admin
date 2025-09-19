package com.nagornyi.appengine;

import com.google.appengine.api.users.User;
import java.time.Instant;
import javax.annotation.Nullable;
import javax.annotation.processing.Generated;

@Generated("com.google.auto.value.processor.AutoValueProcessor")
final class AutoValue_Greeting extends Greeting {

  @Nullable
  private final User user;

  private final Instant date;

  private final String content;

  AutoValue_Greeting(
      @Nullable User user,
      Instant date,
      String content) {
    this.user = user;
    if (date == null) {
      throw new NullPointerException("Null date");
    }
    this.date = date;
    if (content == null) {
      throw new NullPointerException("Null content");
    }
    this.content = content;
  }

  @Nullable
  @Override
  public User getUser() {
    return user;
  }

  @Override
  public Instant getDate() {
    return date;
  }

  @Override
  public String getContent() {
    return content;
  }

  @Override
  public String toString() {
    return "Greeting{"
        + "user=" + user + ", "
        + "date=" + date + ", "
        + "content=" + content
        + "}";
  }

  @Override
  public boolean equals(Object o) {
    if (o == this) {
      return true;
    }
    if (o instanceof Greeting) {
      Greeting that = (Greeting) o;
      return (this.user == null ? that.getUser() == null : this.user.equals(that.getUser()))
          && this.date.equals(that.getDate())
          && this.content.equals(that.getContent());
    }
    return false;
  }

  @Override
  public int hashCode() {
    int h$ = 1;
    h$ *= 1000003;
    h$ ^= (user == null) ? 0 : user.hashCode();
    h$ *= 1000003;
    h$ ^= date.hashCode();
    h$ *= 1000003;
    h$ ^= content.hashCode();
    return h$;
  }

}
